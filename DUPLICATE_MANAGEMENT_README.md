# Duplicate Lead Management System

This document describes the comprehensive duplicate lead management system implemented in EPIC CRM 2.0 to handle leads with the same phone number.

## 🎯 Problem Solved

Previously, when a lead with the same phone number entered the system, it would create separate lead records, resulting in:
- Multiple leads for the same customer
- Fragmented lead history
- Inefficient sales processes
- Data inconsistency

## 🔧 Solution Components

### 1. Database Migration
**File**: `scripts/add_phone_unique_constraint.sql`

- Identifies and merges existing duplicate leads
- Adds unique constraint on `customer_mobile_number`
- Updates related tables to maintain referential integrity
- Creates optimized indexes for phone number lookups

**How to run**:
```sql
-- Connect to your PostgreSQL database and run:
\i scripts/add_phone_unique_constraint.sql
```

### 2. Duplicate Manager Module
**File**: `backend/fastapi_app/duplicate_manager.py`

Core functionality:
- **Phone-based deduplication**: Uses phone number as primary key for identifying duplicates
- **Smart data merging**: Combines lead data intelligently, keeping non-null values
- **Batch processing**: Handles bulk operations efficiently
- **Fallback mechanisms**: Graceful error handling with fallbacks

Key methods:
```python
# Find existing lead by phone
find_existing_lead_by_phone(phone: str) -> Optional[Dict]

# Create or update lead (handles duplicates automatically)
create_or_update_lead(lead_data: Dict) -> Tuple[str, str, bool]

# Process multiple leads with deduplication
bulk_deduplicate_leads(leads_data: List[Dict]) -> Dict
```

### 3. Updated Lead Creation Endpoints

#### Regular Lead Creation (`/api/leads`)
- Now uses duplicate manager to check for existing leads by phone
- Updates existing lead if found, creates new if not
- Returns action type (`created` or `updated`)

#### CRE Lead Creation (`/api/cre/leads`)
- Enhanced with duplicate management
- Preserves all original functionality
- Better handling of lead updates vs creation

#### Bulk Upload (`/api/admin/leads/upload`)
- Completely rewritten to use duplicate manager
- No longer rejects duplicates - merges them instead
- Provides detailed statistics about operations performed

### 4. Background Workers Update
**File**: `backend/fastapi_app/workers.py`

- Modified `upsert_leads()` method to use phone-based deduplication
- Maintains backward compatibility with fallback to UID-based conflicts
- Enhanced logging and error reporting

### 5. Admin Management Interface
**File**: `app/admin/manage-duplicates/page.tsx`

Web interface for administrators to:
- View duplicate statistics
- Monitor phone numbers with multiple leads
- Manually merge specific duplicates
- Run cleanup operations

**Access**: `/admin/manage-duplicates`

### 6. API Endpoints for Duplicate Management

#### Get Duplicate Statistics
```
GET /api/admin/duplicates/stats
```
Returns:
- Total unique phone numbers
- Count of phones with duplicates
- List of top duplicate phone numbers

#### Clean Duplicate Leads
```
POST /api/admin/duplicates/clean
```
Recommends running migration script for bulk cleanup.

#### Merge Specific Duplicates
```
POST /api/admin/leads/merge
```
Body: `{ "phone_number": "1234567890" }`
Manually merges all leads with the specified phone number.

## 🚀 How It Works

### For New Leads

1. **Lead Creation Request**: User creates a new lead via any endpoint
2. **Phone Number Check**: System checks if phone number already exists
3. **Smart Decision**:
   - **If not found**: Creates new lead
   - **If found**: Merges new data into existing lead
4. **Response**: Returns lead UID and action performed

### Data Merging Strategy

When duplicate phone numbers are found:

1. **Keep the oldest lead** as the primary record
2. **Merge data** from newer leads:
   - Non-null values override null values
   - Newer timestamps for updated fields
   - Metadata is merged (not overwritten)
   - Assignment info is updated if provided
3. **Update related tables** to point to primary lead
4. **Remove duplicate records**

### Example Merge Logic

```python
# Existing Lead:
{
  "uid": "LD12345678",
  "customer_name": "John Doe",
  "customer_mobile_number": "9876543210",
  "lead_status": null,
  "model_interested": null,
  "cre_name": null
}

# New Lead Data:
{
  "customer_name": "John D",  # Will keep existing "John Doe"
  "customer_mobile_number": "9876543210",
  "lead_status": "Qualified",  # Will update
  "model_interested": "Swift",  # Will update
  "cre_name": "Sarah"  # Will update
}

# Merged Result:
{
  "uid": "LD12345678",  # Keeps original UID
  "customer_name": "John Doe",  # Keeps non-empty existing value
  "customer_mobile_number": "9876543210",
  "lead_status": "Qualified",  # Updated with new value
  "model_interested": "Swift",  # Updated with new value
  "cre_name": "Sarah",  # Updated with new value
  "updated_at": "2024-01-15T10:30:00"  # Updated timestamp
}
```

## 📊 Benefits

### For Sales Teams
- **Single source of truth**: One lead record per customer phone number
- **Complete history**: All interactions and updates in one place
- **Better follow-ups**: No confusion about which lead to work on
- **Improved conversion tracking**: Accurate metrics per unique customer

### For Administrators
- **Data cleanliness**: Automatic duplicate prevention
- **Better reporting**: Accurate lead counts and conversion rates
- **Easy management**: Admin interface to monitor and manage duplicates
- **Bulk operations**: Efficient handling of large data imports

### For System Performance
- **Reduced storage**: No redundant lead records
- **Faster queries**: Fewer records to process
- **Better indexing**: Optimized database structure
- **Consistent relationships**: Clean foreign key relationships

## 🔧 Configuration

### Environment Variables
No additional environment variables required. The system uses existing database connections.

### Database Requirements
- PostgreSQL with support for unique constraints
- Existing Supabase client configuration

## 🚨 Migration Process

### Step 1: Backup Database
```bash
# Create a backup before running migration
pg_dump your_database > backup_before_duplicate_cleanup.sql
```

### Step 2: Run Migration Script
```sql
-- This script will:
-- 1. Identify duplicate leads
-- 2. Merge data into oldest lead per phone number
-- 3. Update related tables
-- 4. Add unique constraint
-- 5. Create optimized indexes

\i scripts/add_phone_unique_constraint.sql
```

### Step 3: Verify Results  
```sql
-- Check for any remaining duplicates
SELECT 
    customer_mobile_number,
    COUNT(*) as count,
    string_agg(uid, ', ') as uids
FROM lead_master 
WHERE customer_mobile_number IS NOT NULL 
GROUP BY customer_mobile_number 
HAVING COUNT(*) > 1;

-- Should return no rows if successful
```

### Step 4: Monitor System
- Use admin interface at `/admin/manage-duplicates`
- Check logs for any duplicate management issues
- Monitor API response times (should improve)

## 🐛 Troubleshooting

### Common Issues

#### 1. Migration Fails Due to Constraints
**Error**: Foreign key constraint violations during cleanup
**Solution**: 
- Check and update related tables manually
- Ensure all related records point to correct lead UIDs

#### 2. Duplicate Manager Import Errors
**Error**: `ImportError: cannot import name 'duplicate_manager'`
**Solution**:
- Ensure `duplicate_manager.py` is in the correct path
- Check Python path and module imports
- Restart the application server

#### 3. Phone Number Validation Issues
**Error**: Leads not being merged due to phone format differences
**Solution**:
- Check `_clean_phone_number()` method in duplicate manager
- Ensure consistent phone number formatting (10 digits)
- Update validation rules if needed

### Debugging

Enable detailed logging:
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('duplicate_manager')
```

Check duplicate statistics:
```bash
curl -X GET "/api/admin/duplicates/stats" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 Monitoring

### Key Metrics to Monitor

1. **Duplicate Rate**: Should decrease over time
2. **Merge Success Rate**: Should be > 95%
3. **API Response Times**: Should improve due to fewer records
4. **Lead Creation vs Update Ratio**: Monitor via logs

### Admin Dashboard

The duplicate management interface provides:
- Real-time statistics
- Top duplicate phone numbers
- Manual merge capabilities
- Migration recommendations

## 🔄 Future Enhancements

### Planned Features
1. **Email-based deduplication**: Extend to handle email duplicates
2. **Fuzzy name matching**: Handle slight name variations
3. **Automated cleanup jobs**: Scheduled duplicate cleanup
4. **Advanced merge rules**: Configurable merge strategies

### API Improvements
1. **Webhook notifications**: Alert on duplicate merges
2. **Batch merge endpoints**: Handle multiple phone numbers at once
3. **Rollback capabilities**: Undo merge operations if needed

## 🤝 Contributing

When modifying the duplicate management system:

1. **Test thoroughly**: Use test phone numbers and verify merging behavior
2. **Update documentation**: Keep this README current
3. **Add logging**: Include appropriate log statements for debugging
4. **Handle errors gracefully**: Always provide fallback mechanisms
5. **Performance consideration**: Optimize for bulk operations

## 📞 Support

For issues related to duplicate management:

1. Check the admin interface first: `/admin/manage-duplicates`
2. Review application logs for error messages
3. Verify database constraints and indexes
4. Test with sample data to reproduce issues

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Compatibility**: EPIC CRM 2.0+
