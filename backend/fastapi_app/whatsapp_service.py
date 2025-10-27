import requests
from typing import Dict
import logging
from decouple import config
import os

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.template_api_url = "https://public.doubletick.io/whatsapp/message/template"
        # Try to get auth key from config, fall back to environment variable, then hardcoded test key
        self.auth_key = config('WHATSAPP_AUTH_KEY', default='') or os.getenv('WHATSAPP_AUTH_KEY', '')
        
        # Fallback to test key if not set - REPLACE THIS IN PRODUCTION
        if not self.auth_key:
            self.auth_key = "key_krQnEjbvJeueh3YPEtG6sIaOt8a0e2zFUZENBq45MkW3AOuICErP3PR2jpIyyT09ns2VH4BPGoN4sKRGPQLb4c3E4SjnYcqNbrRcEn9zKwIo9i86JtxjexPW1TooOymJMDLFJzQuAmVmLIkHc25duDjUN9ODTF6ZtH4Ddm1qPCMw4waQ24nVq0TqCIl7pYhY2mOqk9dFZTId6d72mcvFyJpB8f8Qp9YTGZ9QjR1mfCNmsOmhs1M9QG4oA26J"
            logger.warning("WHATSAPP_AUTH_KEY not configured, using default test key")
        
        self.template_name = config('WHATSAPP_TEMPLATE_NAME', default='epic_lead_assignment')
        
        print(f"[WhatsApp Service] Initialized with template: {self.template_name}")
        print(f"[WhatsApp Service] Template API URL: {self.template_api_url}")

    def send_template_message(self, to_phone_number: str, template_name: str, language: str, parameters: list) -> Dict:
        try:
            if not self.auth_key:
                return {"success": False, "error": "API key not configured"}
            
            formatted_phone = self._format_phone_number(to_phone_number)
            
            payload = {
                "messages": [{
                    "to": formatted_phone,
                    "content": {
                        "templateName": template_name,
                        "language": language,
                        "templateData": {
                            "body": {
                                "placeholders": [str(p) for p in parameters]
                            }
                        }
                    }
                }]
            }
            
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "Authorization": self.auth_key
            }
            
            print(f"[WhatsApp Template] Sending to {formatted_phone}, template: {template_name}")
            print(f"[WhatsApp Template] Parameters: {parameters}")
            print(f"[WhatsApp Template] Auth Key: {self.auth_key[:50]}...")
            
            response = requests.post(self.template_api_url, json=payload, headers=headers)
            
            print(f"[WhatsApp Template] Status: {response.status_code}, Body: {response.text}")
            
            if response.status_code == 200:
                print("[WhatsApp Template] Template sent successfully")
                response_data = response.json()
                print(f"[WhatsApp Template] Response: {response_data}")
                # Extract messageId and status if available
                message_info = {}
                if 'messages' in response_data and len(response_data['messages']) > 0:
                    message_info = {
                        'messageId': response_data['messages'][0].get('messageId'),
                        'status': response_data['messages'][0].get('status')
                    }
                return {"success": True, "message": "Template sent successfully", "details": message_info}
            else:
                return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
                
        except Exception as e:
            print(f"[WhatsApp Template] Error: {str(e)}")
            return {"success": False, "error": str(e)}

    def _format_phone_number(self, phone_number: str) -> str:
        cleaned = ''.join(filter(str.isdigit, phone_number))
        
        if cleaned.startswith('91'):
            return f"+{cleaned}"
        
        if len(cleaned) == 10:
            return f"+91{cleaned}"
        
        if phone_number.startswith('+'):
            return phone_number
        
        return f"+91{cleaned}"

whatsapp_service = WhatsAppService()
