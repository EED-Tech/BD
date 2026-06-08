-- Insert sample BD tracker data (optional - for testing)
INSERT INTO bd_tracker_records (
    serial_number, bd, quarter, client, organization, title, business_line,
    service_offering, type_bd, country, origin, deadline, cvs_profiles,
    workplan_budget, methodology, other_activity, partners, pc, pd,
    budget, status, timeframe
) VALUES 
(1, 'RFP', 'Q1 2025', 'Ministry of Health', 'Government', 'Healthcare System Modernization', 'Health', 'Digital Transformation', 'RFP', 'Kenya', 'Direct', '2025-03-15', 'Senior Consultant, Technical Lead', 'Detailed workplan included', 'Agile methodology', 'Training workshops', 'Local tech partner', 'John Smith', 'Jane Doe', 250000.00, 'In Progress', '12 months'),
(2, 'EOI', 'Q1 2025', 'World Bank', 'International', 'Education Infrastructure Development', 'Education', 'Infrastructure Planning', 'EOI', 'Tanzania', 'Referral', '2025-02-28', 'Project Manager, Engineers', 'Budget framework provided', 'Traditional PM', 'Community engagement', 'Construction firm', 'Mike Johnson', 'Sarah Wilson', 180000.00, 'Submitted', '18 months'),
(3, 'RFP', 'Q2 2025', 'African Development Bank', 'International', 'Water Resource Management', 'Environment', 'Environmental Consulting', 'RFP', 'Ghana', 'Partnership', '2025-06-30', 'Environmental Specialist, Hydrologist', 'Comprehensive budget', 'Mixed methods', 'Stakeholder workshops', 'Environmental NGO', 'David Brown', 'Lisa Garcia', 320000.00, 'Preparation', '24 months'),
(4, 'Tender', 'Q2 2025', 'Private Mining Company', 'Private', 'Environmental Impact Assessment', 'Environment', 'EIA Services', 'Tender', 'Botswana', 'Direct', '2025-05-15', 'EIA Specialist, Biologist', 'Fixed price contract', 'Standard EIA', 'Public consultations', 'Local research institute', 'Robert Taylor', 'Emma Davis', 95000.00, 'Won', '8 months'),
(5, 'RFP', 'Q3 2025', 'European Union', 'International', 'Climate Change Adaptation', 'Climate', 'Climate Consulting', 'RFP', 'Multi-country', 'Network', '2025-09-01', 'Climate Expert, Policy Analyst', 'EU budget guidelines', 'Participatory approach', 'Policy workshops', 'European research center', 'Chris Anderson', 'Maria Rodriguez', 450000.00, 'Pipeline', '36 months')
ON CONFLICT DO NOTHING;
