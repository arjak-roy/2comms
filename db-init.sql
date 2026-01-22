-- The parent company/group
CREATE TABLE legal_entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- The independent business unit (The Tenant)
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    entity_id INT REFERENCES legal_entities(id),
    name VARCHAR(255) NOT NULL,
    attendance_cycle_start DATE, -- 
    attendance_cycle_end DATE,   -- 
    geo_fencing_enabled BOOLEAN DEFAULT FALSE, -- 
    ot_config JSONB, -- 
    leave_policy_config JSONB, -- 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Branches maintained client-wise 
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    name VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8), -- 
    longitude DECIMAL(11, 8), -- 
    radius_meters INT DEFAULT 100,
    allow_branch_overrides BOOLEAN DEFAULT FALSE, -- 
    branch_rules JSONB -- 
);

CREATE TYPE user_role AS ENUM ('Super Admin', 'Admin', 'HR', 'Employee');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id) NOT NULL, -- 
    branch_id INT REFERENCES branches(id), -- 
    manager_id INT REFERENCES users(id), -- For L1/L2/L3 
    role user_role NOT NULL, -- 
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    designation VARCHAR(100), -- 
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    name VARCHAR(100),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_mins INT DEFAULT 15, -- 
    late_coming_rules JSONB, -- 
    weekly_offs JSONB -- 
);

-- Employee-specific schedule 
CREATE TABLE rosters (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES users(id),
    client_id INT REFERENCES clients(id),
    shift_id INT REFERENCES shifts(id),
    roster_date DATE NOT NULL,
    is_wfh BOOLEAN DEFAULT FALSE, -- 
    location_id INT REFERENCES branches(id), -- 
    UNIQUE(employee_id, roster_date)
);

CREATE TYPE punch_location AS ENUM ('Office', 'WFH', 'Travel', 'External');
CREATE TYPE punch_types AS ENUM ('IN', 'OUT');
CREATE TABLE attendance_punches (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES users(id),
    client_id INT REFERENCES clients(id),
    punch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    punch_type punch_types NOT NULL,
    location_type punch_location NOT NULL, -- 
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    selfie_url TEXT, -- 
    is_valid BOOLEAN DEFAULT TRUE
);

CREATE TYPE att_status AS ENUM('Present', 'Half-Day', 'Absent', 'Leave', 'Holiday'); 

-- Final daily record for payroll 
CREATE TABLE daily_attendance_summary (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES users(id),
    client_id INT REFERENCES clients(id),
    summary_date DATE NOT NULL,
    total_hours DECIMAL(4, 2), --
    status att_status DEFAULT 'Present',
    is_late BOOLEAN DEFAULT FALSE, -- 
    is_locked BOOLEAN DEFAULT FALSE, -- 
    is_frozen BOOLEAN DEFAULT FALSE  -- 
);

CREATE TYPE request_type AS ENUM ('Leave', 'OT', 'Swipe', 'CompOff', 'EarlyLeave');
CREATE TYPE approve_types AS ENUM('Pending', 'Approved', 'Rejected', 'Expired');
CREATE TABLE approval_requests (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    requester_id INT REFERENCES users(id),
    type request_type NOT NULL,
    details JSONB, -- e.g., missing punch time or leave dates
    current_level INT DEFAULT 1, -- L1, L2, L3 
    status approve_types  DEFAULT 'Pending', -- 
    sla_expiry TIMESTAMP, -- 3-business-day window 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TYPE cycle_status AS ENUM ('Open', 'Locked', 'Frozen');

CREATE TABLE attendance_cycles (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status cycle_status DEFAULT 'Open', -- [cite: 42, 43]
    locked_at TIMESTAMP, -- Recorded when HR locks the cycle 
    frozen_at TIMESTAMP, -- Recorded during final audit confirmation 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track specific leave buckets per employee
CREATE TABLE leave_balances (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES users(id),
    client_id INT REFERENCES clients(id),
    leave_type_name VARCHAR(50), -- e.g., 'Sick Leave', 'Casual Leave'
    balance_days DECIMAL(5, 2) DEFAULT 0,
    accrued_this_cycle DECIMAL(5, 2) DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manage holidays (Fixed and Flexi)
CREATE TABLE holiday_calendars (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    branch_id INT REFERENCES branches(id), -- Null if client-wide
    holiday_date DATE NOT NULL,
    name VARCHAR(255),
    is_flexi BOOLEAN DEFAULT FALSE, -- 
    year INT NOT NULL
);

-- Audit log for every approval action at L1, L2, L3
CREATE TABLE approval_history (
    id SERIAL PRIMARY KEY,
    request_id INT REFERENCES approval_requests(id),
    approver_id INT REFERENCES users(id),
    level INT NOT NULL, -- 1, 2, or 3
    action approve_types NOT NULL,
    comments TEXT,
    actioned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- To handle the "Audit Logs" requirement 
CREATE TABLE policy_change_logs (
    id SERIAL PRIMARY KEY,
    client_id INT REFERENCES clients(id),
    changed_by INT REFERENCES users(id),
    table_name VARCHAR(50), -- e.g., 'clients' or 'shifts'
    old_value JSONB,
    new_value JSONB,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE daily_attendance_summary 
ADD CONSTRAINT unique_employee_daily_summary 
UNIQUE (employee_id, summary_date);