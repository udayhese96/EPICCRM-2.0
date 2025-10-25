import requests
import os
from typing import Dict, Optional
import logging
from decouple import config

logger = logging.getLogger(__name__)

class WhatsAppService:
    """WhatsApp service for sending notifications via DoubleTick API"""
    
    def __init__(self):
        self.api_url = "https://public.doubletick.io/whatsapp/message/text"
        self.from_number = config('WHATSAPP_FROM_NUMBER', default='+919500087672')
        self.auth_key = config('WHATSAPP_AUTH_KEY', default='')
        
        if not self.auth_key:
            logger.warning("WHATSAPP_AUTH_KEY not found in environment variables")
    
    def send_message(self, to_phone_number: str, message: str) -> Dict[str, any]:
        """
        Send WhatsApp message to a user
        
        Args:
            to_phone_number: Recipient's phone number (with country code)
            message: Message content to send
            
        Returns:
            Dict with success status and message/error
        """
        try:
            if not self.auth_key:
                return {
                    "success": False,
                    "error": "WhatsApp API key not configured"
                }
            
            # Format phone number to ensure it has country code
            formatted_phone_number = self._format_phone_number(to_phone_number)
            
            payload = {
                "content": {
                    "text": message
                },
                "from": self.from_number,
                "to": formatted_phone_number
            }
            
            headers = {
                "accept": "application/json",
                "content-type": "application/json",
                "Authorization": self.auth_key
            }
            
            logger.info(f"[WhatsApp] Sending message to {formatted_phone_number}")
            
            response = requests.post(self.api_url, json=payload, headers=headers)
            
            if response.status_code == 200:
                logger.info(f"[WhatsApp] Message sent successfully to {formatted_phone_number}")
                return {
                    "success": True,
                    "message": "Message sent successfully"
                }
            else:
                logger.error(f"[WhatsApp] Failed to send message. Status: {response.status_code}")
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"[WhatsApp] Error sending message: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def send_lead_assignment_notification(
        self, 
        ps_phone_number: str, 
        ps_name: str, 
        lead_data: Dict[str, any]
    ) -> Dict[str, any]:
        """
        Send lead assignment notification to PS user
        
        Args:
            ps_phone_number: PS user's phone number
            ps_name: PS user's name
            lead_data: Lead information dictionary
            
        Returns:
            Dict with success status and message/error
        """
        message = self._build_lead_assignment_message(ps_name, lead_data)
        return self.send_message(ps_phone_number, message)
    
    def _build_lead_assignment_message(self, ps_name: str, lead_data: Dict[str, any]) -> str:
        """Build the lead assignment notification message"""
        customer_name = lead_data.get('customer_name', 'Unknown')
        customer_phone = lead_data.get('customer_mobile_number', 'Unknown')
        lead_uid = lead_data.get('lead_uid', 'Unknown')
        source = lead_data.get('source', 'Unknown')
        sub_source = lead_data.get('sub_source', '')
        cre_name = lead_data.get('cre_name', '')
        qualification_remark = lead_data.get('first_remark', '')
        
        # Format phone number to show only last 5 digits
        if customer_phone and len(customer_phone) >= 5:
            phone_display = customer_phone[-5:].rjust(10, 'x')
        else:
            phone_display = customer_phone
        
        message = f"Hi {ps_name},\n\n"
        message += f"Customer Name: {customer_name}\n"
        message += f"Phone Number: {phone_display}\n"
        message += f"Lead ID: {lead_uid}\n"
        message += f"Source: {source}"
        
        if sub_source:
            message += f" - {sub_source}"
        
        if cre_name:
            message += f"\nCRE: {cre_name}"
        
        if qualification_remark:
            message += f"\nQualification Remark: {qualification_remark}"
        
        message += f"\n\nPlease log in to your GEM dashboard to view full details.\n"
        message += f"Link: https://toyota.epicleads.in/\n\n"
        message += f"Best regards,\nEPIC CRM Team"
        
        return message
    
    def _format_phone_number(self, phone_number: str) -> str:
        """
        Format phone number to ensure it has country code
        
        Args:
            phone_number: Phone number to format
            
        Returns:
            Formatted phone number
        """
        # Remove any non-digit characters
        cleaned = ''.join(filter(str.isdigit, phone_number))
        
        # If it starts with 91, return as is
        if cleaned.startswith('91'):
            return f"+{cleaned}"
        
        # If it's a 10-digit number, assume it's Indian and add +91
        if len(cleaned) == 10:
            return f"+91{cleaned}"
        
        # If it's already formatted with +, return as is
        if phone_number.startswith('+'):
            return phone_number
        
        # Default: add +91 prefix
        return f"+91{cleaned}"

# Export singleton instance
whatsapp_service = WhatsAppService()
