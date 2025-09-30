import os
import time
import asyncio
import aiohttp
import random
import string
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Optional
from supabase import create_client
from dotenv import load_dotenv
import pytz

# Load environment variables
load_dotenv()

# Configuration - Read from environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
PAGE_TOKEN = os.getenv("META_PAGE_ACCESS_TOKEN")
PAGE_ID = os.getenv("META_PAGE_ID")

# Validate all required env vars are present
if not all([SUPABASE_URL, SUPABASE_KEY, PAGE_TOKEN, PAGE_ID]):
    raise SystemExit("❌ Missing required environment variables! Check your .env file.")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# IST timezone
IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    """Get current time in IST as string"""
    return datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S')

def generate_uid():
    """Generate random 8-character UID"""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(8))

def normalize_phone_number(phone: str) -> str:
    """Normalize phone to 10-digit format"""
    if not phone:
        return ""
    digits = ''.join(filter(str.isdigit, str(phone)))
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith('0') and len(digits) == 11:
        digits = digits[1:]
    return digits[-10:] if len(digits) >= 10 else digits

def is_within_past_24_hours(created_time_str: str) -> bool:
    """Check if timestamp is within past 24 hours"""
    if not created_time_str:
        return False
    
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S",
    ]
    
    for fmt in formats:
        try:
            created_time = datetime.strptime(created_time_str, fmt)
            if created_time.tzinfo:
                created_time_utc = created_time.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                created_time_utc = created_time
            
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            twenty_four_hours_ago = now - timedelta(hours=24)
            return twenty_four_hours_ago <= created_time_utc <= now
        except (ValueError, TypeError):
            continue
    
    return False

def check_duplicate_in_db(phone: str) -> bool:
    """Check if phone number already exists in lead_master"""
    try:
        result = supabase.table("lead_master")\
            .select("id")\
            .eq("customer_mobile_number", phone)\
            .execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"❌ Error checking duplicate: {e}")
        return False

class MetaLeadsAPI:
    def __init__(self, page_token: str, page_id: str):
        self.page_token = page_token
        self.page_id = page_id
        self.api_version = "v21.0"
        self.semaphore = asyncio.Semaphore(3)
    
    async def _make_request(self, session, url: str, params: dict = None, max_retries: int = 3) -> dict:
        """Make API request with retries"""
        for attempt in range(max_retries):
            async with self.semaphore:
                try:
                    await asyncio.sleep(1 + attempt)
                    async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        if response.status == 200:
                            return await response.json()
                        elif response.status == 429:
                            retry_after = int(response.headers.get('Retry-After', 60))
                            print(f"⏳ Rate limited, waiting {retry_after}s...")
                            await asyncio.sleep(retry_after)
                            continue
                        elif response.status == 500:
                            wait_time = (2 ** attempt) * 5
                            print(f"⚠️ Server error, waiting {wait_time}s...")
                            if attempt < max_retries - 1:
                                await asyncio.sleep(wait_time)
                                continue
                        else:
                            print(f"⚠️ HTTP {response.status} error")
                            return {}
                except Exception as e:
                    print(f"❌ Request error: {str(e)[:100]}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    return {}
        return {}
    
    async def fetch_forms(self):
        """Fetch all leadgen forms"""
        connector = aiohttp.TCPConnector(limit=10)
        timeout = aiohttp.ClientTimeout(total=60)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            url = f"https://graph.facebook.com/{self.api_version}/{self.page_id}/leadgen_forms"
            params = {
                "access_token": self.page_token,
                "fields": "id,name,status",
                "limit": 100
            }
            
            response = await self._make_request(session, url, params)
            forms = response.get("data", [])
            print(f"✅ Found {len(forms)} forms")
            return forms
    
    async def fetch_form_leads(self, session, form_id: str, form_name: str, since_hours: int = 24):
        """Fetch leads for a single form"""
        try:
            since_time = int((datetime.now(timezone.utc) - timedelta(hours=since_hours)).timestamp())
            
            url = f"https://graph.facebook.com/{self.api_version}/{form_id}/leads"
            params = {
                "access_token": self.page_token,
                "limit": 50,
                "since": since_time
            }
            
            all_leads = []
            page_count = 0
            max_pages = 10
            
            while url and page_count < max_pages:
                response = await self._make_request(session, url, params)
                
                if not response.get("data"):
                    break
                
                leads = response["data"]
                
                # Filter for 24-hour window
                for lead in leads:
                    if is_within_past_24_hours(lead.get("created_time", "")):
                        all_leads.append({**lead, "form_name": form_name})
                
                page_count += 1
                paging = response.get("paging", {})
                url = paging.get("next")
                params = None
                
                await asyncio.sleep(0.5)
            
            return form_id, all_leads
            
        except Exception as e:
            print(f"❌ Error fetching leads for form {form_id}: {e}")
            return form_id, []
    
    async def fetch_all_leads(self, forms: List[dict]):
        """Fetch all leads from all forms"""
        connector = aiohttp.TCPConnector(limit=10)
        timeout = aiohttp.ClientTimeout(total=120)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            all_results = {}
            
            # Process in batches of 5
            batch_size = 5
            for i in range(0, len(forms), batch_size):
                batch = forms[i:i + batch_size]
                print(f"📥 Processing batch {i//batch_size + 1}/{(len(forms)+batch_size-1)//batch_size}...")
                
                tasks = [
                    self.fetch_form_leads(session, form['id'], form.get('name', 'Unknown'))
                    for form in batch
                ]
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, tuple) and len(result) == 2:
                        form_id, leads = result
                        all_results[form_id] = leads
                        if leads:
                            print(f"   ✅ {len(leads)} leads found")
                
                if i + batch_size < len(forms):
                    await asyncio.sleep(3)
            
            return all_results

def map_lead_to_db_format(raw_lead: dict) -> Optional[dict]:
    """Map Meta lead to database format"""
    try:
        # Extract field data
        field_data = raw_lead.get("field_data", [])
        if not field_data:
            return None
        
        answers = {}
        for field in field_data:
            field_name = field.get("name", "").lower()
            field_values = field.get("values", [])
            if field_values and field_values[0]:
                answers[field_name] = str(field_values[0]).strip()
        
        # Find name
        name_fields = ["full_name", "full name", "name", "customer_name", "first_name"]
        name = ""
        for field in name_fields:
            if field in answers and answers[field]:
                name = answers[field]
                break
        
        # Find phone
        phone_fields = ["phone_number", "contact_number", "phone", "mobile", "mobile_number"]
        phone = ""
        for field in phone_fields:
            if field in answers and answers[field]:
                phone = answers[field]
                break
        
        if not phone:
            return None
        
        normalized_phone = normalize_phone_number(phone)
        if not normalized_phone or len(normalized_phone) != 10:
            return None
        
        # Get date from created_time
        created_time = raw_lead.get("created_time", "")
        try:
            if created_time:
                date_str = created_time[:10]
                datetime.strptime(date_str, "%Y-%m-%d")
            else:
                date_str = datetime.now(IST).strftime("%Y-%m-%d")
        except:
            date_str = datetime.now(IST).strftime("%Y-%m-%d")
        
        now_ist = get_ist_now()
        form_name = raw_lead.get("form_name", "Unknown Campaign")
        
        return {
            "uid": generate_uid(),
            "date": date_str,
            "customer_name": name or "Unknown",
            "customer_mobile_number": normalized_phone,
            "alternate_mobile_number": None,
            "source": "Meta",
            "sub_source": "Ads",
            "campaign": form_name,
            "cre_name": None,
            "cre_id": None,
            "lead_category": None,
            "model_interested": None,
            "assigned": "No",
            "lead_status": "Pending",
            "follow_up_date": None,
            "first_call_date": None,
            "first_remark": None,
            "second_call_date": None,
            "second_remark": None,
            "third_call_date": None,
            "third_remark": None,
            "fourth_call_date": None,
            "fourth_remark": None,
            "fifth_call_date": None,
            "fifth_remark": None,
            "sixth_call_date": None,
            "sixth_remark": None,
            "final_status": "Pending",
            "out_of_station_location": None,
            "created_at": now_ist,
            "updated_at": now_ist,
            "cre_assigned_at": None,
            "won_timestamp": None,
            "lost_timestamp": None,
            "tat": None,
            "variant": None,
            "buying_plan": None,
            "finance_option": None,
            "profession": None,
            "test_drive_type": None,
            "trade_in": None,
            "customer_location": None,
            "branch": None,
            "ps_name": None,
            "ps_id": None,
            "metadata": "{}",
            "icrop_id": None
        }
        
    except Exception as e:
        print(f"❌ Error mapping lead: {e}")
        return None

def insert_leads_to_db(leads: List[dict]) -> tuple:
    """Insert leads to database with duplicate checking"""
    inserted = 0
    duplicates = 0
    failed = 0
    
    for lead in leads:
        try:
            phone = lead['customer_mobile_number']
            
            # Check for duplicate
            if check_duplicate_in_db(phone):
                print(f"⏭️ Skipping duplicate: {phone}")
                duplicates += 1
                continue
            
            # Insert lead
            supabase.table("lead_master").insert(lead).execute()
            print(f"✅ Inserted: {lead['uid']} | {lead['customer_name']} | {phone}")
            inserted += 1
            time.sleep(0.1)  # Small delay
            
        except Exception as e:
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                print(f"⏭️ Database duplicate: {phone}")
                duplicates += 1
            else:
                print(f"❌ Insert failed: {e}")
                failed += 1
    
    return inserted, duplicates, failed

async def sync_meta_leads():
    """Main sync function"""
    print("🚀 Meta Leads Sync Starting...")
    print(f"🕐 Current time (IST): {get_ist_now()}")
    start_time = time.time()
    
    try:
        # Initialize API
        api = MetaLeadsAPI(PAGE_TOKEN, PAGE_ID)
        
        # Fetch forms
        print("\n📋 Fetching forms...")
        forms = await api.fetch_forms()
        
        if not forms:
            print("❌ No forms found")
            return
        
        # Fetch leads
        print(f"\n📥 Fetching leads from past 24 hours...")
        form_leads = await api.fetch_all_leads(forms)
        
        # Collect all leads
        all_raw_leads = []
        for form_id, leads in form_leads.items():
            all_raw_leads.extend(leads)
        
        print(f"\n✅ Total raw leads collected: {len(all_raw_leads)}")
        
        if not all_raw_leads:
            print("📭 No leads found in past 24 hours")
            return
        
        # Map leads to DB format
        print("\n⚡ Processing leads...")
        mapped_leads = []
        for raw_lead in all_raw_leads:
            mapped = map_lead_to_db_format(raw_lead)
            if mapped:
                mapped_leads.append(mapped)
        
        print(f"✅ Valid leads after processing: {len(mapped_leads)}")
        
        if not mapped_leads:
            print("📭 No valid leads to insert")
            return
        
        # Remove intra-batch duplicates
        print("\n🧹 Removing intra-batch duplicates...")
        seen_phones = set()
        unique_leads = []
        intra_duplicates = 0
        
        for lead in mapped_leads:
            phone = lead['customer_mobile_number']
            if phone in seen_phones:
                intra_duplicates += 1
                continue
            seen_phones.add(phone)
            unique_leads.append(lead)
        
        if intra_duplicates > 0:
            print(f"🧹 Removed {intra_duplicates} intra-batch duplicates")
        
        print(f"✅ Unique leads to insert: {len(unique_leads)}")
        
        # Insert to database
        print("\n💾 Inserting leads to database...")
        inserted, duplicates, failed = insert_leads_to_db(unique_leads)
        
        # Final report
        elapsed = time.time() - start_time
        print(f"\n🎯 FINAL RESULTS:")
        print(f"   📥 Total raw leads: {len(all_raw_leads)}")
        print(f"   ✅ Valid leads: {len(mapped_leads)}")
        print(f"   🔄 Intra-batch duplicates: {intra_duplicates}")
        print(f"   ➕ Successfully inserted: {inserted}")
        print(f"   ⏭️ Skipped (duplicates): {duplicates}")
        print(f"   ❌ Failed: {failed}")
        print(f"   ⚡ Total time: {elapsed:.2f}s")
        
    except Exception as e:
        print(f"❌ Critical error: {e}")
        import traceback
        traceback.print_exc()

# Main execution
if __name__ == "__main__":
    try:
        asyncio.run(sync_meta_leads())
    except KeyboardInterrupt:
        print("\n⚠️ Sync interrupted by user")
    except Exception as e:
        print(f"❌ Script failed: {e}")
        import traceback
        traceback.print_exc()