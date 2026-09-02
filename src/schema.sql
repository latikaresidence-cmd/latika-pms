-- Latika Residence PMS — PostgreSQL Schema
-- Run this once to set up the database

-- Sessions table (for login)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default",
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid)
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session(expire);

-- Apartments
CREATE TABLE IF NOT EXISTS apartments (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(10) NOT NULL DEFAULT '1br',
  floor VARCHAR(50),
  rate_night DECIMAL(10,2) DEFAULT 0,
  rate_week DECIMAL(10,2) DEFAULT 0,
  rate_month DECIMAL(10,2) DEFAULT 0,
  rate_type VARCHAR(10) DEFAULT 'night',
  max_guests INTEGER DEFAULT 2,
  status VARCHAR(20) DEFAULT 'available',
  allow_expat BOOLEAN DEFAULT true,
  min_contract_months INTEGER DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Guests
CREATE TABLE IF NOT EXISTS guests (
  id VARCHAR(20) PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  country VARCHAR(100),
  id_num VARCHAR(100),
  lang VARCHAR(5) DEFAULT 'en',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reservations
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(20) PRIMARY KEY,
  apt_id VARCHAR(20) REFERENCES apartments(id),
  guest_id VARCHAR(20) REFERENCES guests(id),
  checkin DATE NOT NULL,
  checkout DATE NOT NULL,
  rate DECIMAL(10,2),
  rate_type VARCHAR(10) DEFAULT 'night',
  total DECIMAL(10,2),
  nights INTEGER,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'confirmed',
  source VARCHAR(50) DEFAULT 'direct',
  notes TEXT,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  deposit_status VARCHAR(30) DEFAULT 'not_collected',
  deposit_note TEXT,
  employer VARCHAR(200),
  contract_duration VARCHAR(20),
  contract_start DATE,
  contract_end DATE,
  contract_ref VARCHAR(100),
  actual_checkin TIME,
  actual_checkout TIME,
  key_handed_over BOOLEAN DEFAULT false,
  key_returned BOOLEAN DEFAULT false,
  condition VARCHAR(20),
  damage_desc TEXT,
  checkin_notes TEXT,
  checkout_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(20) PRIMARY KEY,
  res_id VARCHAR(20) REFERENCES reservations(id),
  inv_id VARCHAR(20),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  method VARCHAR(50) DEFAULT 'Cash',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(20) PRIMARY KEY,
  number VARCHAR(30) UNIQUE,
  res_id VARCHAR(20) REFERENCES reservations(id),
  invoice_date DATE,
  period_from DATE,
  period_to DATE,
  rent_label VARCHAR(100) DEFAULT 'Monthly Rent',
  rent DECIMAL(10,2) DEFAULT 0,
  elec_on BOOLEAN DEFAULT false,
  elec_prev DECIMAL(10,2),
  elec_curr DECIMAL(10,2),
  elec_price DECIMAL(10,4),
  elec_amount DECIMAL(10,2) DEFAULT 0,
  water_on BOOLEAN DEFAULT false,
  water_prev DECIMAL(10,2),
  water_curr DECIMAL(10,2),
  water_price DECIMAL(10,4),
  water_amount DECIMAL(10,2) DEFAULT 0,
  extras JSONB DEFAULT '[]',
  total DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Housekeeping
CREATE TABLE IF NOT EXISTS housekeeping (
  apt_id VARCHAR(20) PRIMARY KEY REFERENCES apartments(id),
  status VARCHAR(20) DEFAULT 'clean',
  assigned_to VARCHAR(100),
  note TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Maintenance tickets
CREATE TABLE IF NOT EXISTS maintenance (
  id VARCHAR(20) PRIMARY KEY,
  number VARCHAR(20) UNIQUE,
  apt_id VARCHAR(20) REFERENCES apartments(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'open',
  assigned_to VARCHAR(100),
  cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

-- Insert default settings
INSERT INTO settings (key, value) VALUES
  ('property_name', 'Latika Residence'),
  ('address', '3 Monkeys Road 17252 Siem Reap'),
  ('phone', '+855 972 304 710'),
  ('tin', 'E116-2600001351'),
  ('currency', '$'),
  ('checkin_time', '14:00'),
  ('checkout_time', '12:00')
ON CONFLICT (key) DO NOTHING;

-- Insert default apartments
INSERT INTO apartments (id, name, type, floor, rate_night, rate_week, rate_month, rate_type, max_guests, allow_expat, notes) VALUES
  ('a1', 'Apt G02', '1br', '1st Floor', 35, 95, 280, 'night', 2, false, 'Single separated bedroom with pool access'),
  ('a2', 'Apt G03', '1br', '2nd Floor', 65, 145, 639.50, 'month', 2, false, 'Direct Pool Access with terrace, 2 bedrooms separated'),
  ('a3', 'Apt F02', '1br', '1st Floor', 25, 85, 280, 'month', 2, true, 'Pool view, separate Bedroom'),
  ('a4', 'Apt F03', '2br', '3rd Floor', 55, 135, 400, 'month', 4, true, 'Pool view, Corner suite with 2 bedrooms separated'),
  ('a5', 'Apt 301', '2br', '3rd Floor', 130, 800, 2600, 'month', 4, true, 'Panoramic view, 2 bathrooms'),
  ('a6', 'Apt 302', '2br', '3rd Floor', 130, 800, 2600, 'month', 4, true, 'Corner suite')
ON CONFLICT (id) DO NOTHING;
