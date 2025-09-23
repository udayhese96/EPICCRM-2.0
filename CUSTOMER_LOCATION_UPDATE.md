# Customer Location Update for Qualified Leads

## Overview
This update adds the `customer_location` column to the `qualified_leads` table and ensures it gets populated when a lead is qualified by a CRE user.

## Changes Made

### 1. Database Schema Update
- **File**: `add_customer_location_to_qualified_leads.sql`
- **Action**: Added `customer_location` column to `qualified_leads` table
- **Column Type**: `text NULL`
- **Index**: Created index for better performance on location-based queries

### 2. API Updates
- **File**: `backend/fastapi_app/main.py`
- **Changes**:
  - Updated `qualified_lead_data` mapping in lead qualification endpoint to include `customer_location`
  - Updated `QualifiedLeadResponse` model to include `customer_location` field

### 3. Lead Qualification Process
When a CRE user qualifies a lead, the system now:
1. Captures the `customer_location` from the lead data
2. Stores it in the `lead_master` table (already supported)
3. **NEW**: Copies it to the `qualified_leads` table for easy access by CRE Team Leaders

## Implementation Details

### Database Schema
```sql
ALTER TABLE public.qualified_leads 
ADD COLUMN IF NOT EXISTS customer_location text NULL;
```

### API Response Model
```python
class QualifiedLeadResponse(BaseModel):
    # ... existing fields ...
    customer_location: Optional[str] = None
    # ... rest of fields ...
```

### Lead Qualification Data Mapping
```python
qualified_lead_data = {
    # ... existing fields ...
    "customer_location": lead_data.get('customer_location', ''),
    # ... rest of fields ...
}
```

## Testing

### Test Script
- **File**: `test_customer_location.py`
- **Purpose**: Verifies that `customer_location` is properly populated when leads are qualified
- **Usage**: Run the script to test the functionality

### Manual Testing Steps
1. Login as a CRE user
2. Open a lead for qualification
3. Fill in the `customer_location` field
4. Qualify the lead
5. Check the `qualified_leads` table - `customer_location` should be populated

## Benefits

1. **Improved Data Access**: CRE Team Leaders can now see customer locations directly in the qualified leads view
2. **Better Lead Assignment**: Location data helps in assigning leads to appropriate PS users
3. **Enhanced Reporting**: Location-based analytics and reporting capabilities
4. **Consistent Data**: Location information is available throughout the lead lifecycle

## Files Modified

1. `add_customer_location_to_qualified_leads.sql` - Database schema update
2. `backend/fastapi_app/main.py` - API and model updates
3. `test_customer_location.py` - Test script
4. `CUSTOMER_LOCATION_UPDATE.md` - This documentation

## Deployment Steps

1. **Run Database Migration**:
   ```sql
   -- Execute the SQL script in your Supabase SQL editor
   \i add_customer_location_to_qualified_leads.sql
   ```

2. **Deploy API Changes**:
   - The FastAPI changes are already in place
   - Restart the FastAPI server to apply changes

3. **Test the Implementation**:
   ```bash
   python test_customer_location.py
   ```

## Verification

After deployment, verify that:
- [ ] `customer_location` column exists in `qualified_leads` table
- [ ] New qualified leads include `customer_location` data
- [ ] API responses include `customer_location` field
- [ ] Frontend can display location information (if needed)

## Notes

- The `customer_location` field is optional and defaults to empty string if not provided
- Existing qualified leads will have empty `customer_location` values
- The field supports any text input for maximum flexibility
- An index has been created for efficient location-based queries

---

**Status**: ✅ Complete and Ready for Testing
**Date**: December 2024
**Version**: 2.0.1

