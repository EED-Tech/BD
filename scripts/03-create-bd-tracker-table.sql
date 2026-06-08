-- Create table to store BD tracker records (optional - for database storage)
CREATE TABLE IF NOT EXISTS bd_tracker_records (
  id BIGSERIAL PRIMARY KEY,
  serial_number INTEGER,
  bd TEXT,
  quarter TEXT,
  client TEXT,
  organization TEXT,
  title TEXT,
  business_line TEXT,
  service_offering TEXT,
  type_bd TEXT,
  country TEXT,
  origin TEXT,
  deadline TEXT,
  cvs_profiles TEXT,
  workplan_budget TEXT,
  methodology TEXT,
  other_activity TEXT,
  partners TEXT,
  pc TEXT,
  pd TEXT,
  budget DECIMAL(15,2) DEFAULT 0,
  status TEXT,
  timeframe TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bd_tracker_quarter ON bd_tracker_records(quarter);
CREATE INDEX IF NOT EXISTS idx_bd_tracker_status ON bd_tracker_records(status);
CREATE INDEX IF NOT EXISTS idx_bd_tracker_country ON bd_tracker_records(country);
CREATE INDEX IF NOT EXISTS idx_bd_tracker_business_line ON bd_tracker_records(business_line);
CREATE INDEX IF NOT EXISTS idx_bd_tracker_client ON bd_tracker_records(client);
