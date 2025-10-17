-- Script to add 5 dummy leads for testing source + subsource grouping
-- Run this in your Supabase SQL editor or PostgreSQL client

INSERT INTO lead_master (
    customer_name,
    customer_mobile_number,
    source,
    sub_source,
    assigned,
    lead_status,
    final_status,
    date,
    created_at,
    updated_at,
    branch,
    lead_category,
    model_interested,
    variant
) VALUES
-- 5 test leads with different source + subsource combinations
('Test Customer 1', '9876540001', 'Meta', 'Ads', 'No', NULL, 'Pending', CURRENT_DATE - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'Mount Road', 'New', 'Innova', 'GX'),
('Test Customer 2', '9876540002', 'Meta', 'Web', 'No', NULL, 'Pending', CURRENT_DATE - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'Mount Road', 'New', 'Fortuner', 'VX'),
('Test Customer 3', '9876540003', 'Google', 'Web', 'No', NULL, 'Pending', CURRENT_DATE - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'Mount Road', 'New', 'Camry', 'ZX'),
('Test Customer 4', '9876540004', 'CarDekho', 'CD B', 'No', NULL, 'Pending', CURRENT_DATE - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 'Mount Road', 'New', 'Glanza', 'GX'),
('Test Customer 5', '9876540005', 'Referral', '', 'No', NULL, 'Pending', CURRENT_DATE - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 'Mount Road', 'New', 'Urban Cruiser', 'VX');

-- Show summary of inserted leads
SELECT 
    CASE 
        WHEN sub_source = '' THEN source
        ELSE source || ' + ' || sub_source
    END as source_combination,
    COUNT(*) as lead_count
FROM lead_master 
WHERE customer_name LIKE 'Test Customer %'
GROUP BY source, sub_source
ORDER BY source, sub_source;
