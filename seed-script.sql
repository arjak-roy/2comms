-- 1. Create the Parent
INSERT INTO legal_entities (name) VALUES ('XYZ Group');

-- 2. Create the Clients (Tenants)
INSERT INTO clients (entity_id, name) VALUES (1, 'XYZ Tech Solutions');
INSERT INTO clients (entity_id, name) VALUES (1, 'XYZ Manufacturing');
INSERT INTO clients (entity_id, name) VALUES (1, 'XYZ Logistics');
INSERT INTO clients (entity_id, name) VALUES (1, 'XYZ Retail');

-- 3. Create a Branch for Tech Solutions
INSERT INTO branches (client_id, name, latitude, longitude) 
VALUES (1, 'Bangalore IT Park', 12.9716, 77.5946);

-- 4. Create a Shift for Tech Solutions
INSERT INTO shifts (client_id, name, start_time, end_time) 
VALUES (1, 'Day Shift', '08:00:00', '16:00:00');

-- 5. Create a Shift for Tech Solutions
INSERT INTO shifts (client_id, name, start_time, end_time) 
VALUES (1, 'Night Shift', '20:00:00', '04:00:00');

-- 6. creating users

-- 6.1. Create a Super Admin (Global access, no specific client_id required if nullable, 
-- but usually mapped to a 'System' client or client 1)
INSERT INTO users (client_id, name, email, password_hash, role) 
VALUES (1, 'Arjak SuperAdmin', 'superadmin@xyzgroup.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Super Admin');

-- 2. Create an Admin for XYZ Tech Solutions
INSERT INTO users (client_id, branch_id, name, email, password_hash, role) 
VALUES (1, 1, 'Tech Admin', 'admin@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Admin');

-- 3. Create an HR Manager for XYZ Tech Solutions
INSERT INTO users (client_id, branch_id, name, email, password_hash, role) 
VALUES (1, 1, 'Tech HR Manager', 'hr@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'HR');

-- 4. Create a Manager (L1 Approver)
INSERT INTO users (client_id, branch_id, name, email, password_hash, role) 
VALUES (1, 1, 'Project Manager', 'manager@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Employee');

-- 5. Create a Standard Employee (Mapped to the Manager above)
-- Assuming the Project Manager's ID is 4
INSERT INTO users (client_id, branch_id, manager_id, name, email, password_hash, role) 
VALUES (1, 1, 4, 'John Doe', 'john@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Employee');

-- 1. Create a Second Manager (L1 Approver) for the Night Shift
INSERT INTO users (client_id, branch_id, name, email, hashed_password, role) 
VALUES (1, 1, 'Sarah Night-Lead', 'sarah@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Employee');

-- 2. Create Employees reporting to Project Manager (User ID: 4)
INSERT INTO users (client_id, branch_id, manager_id, name, email, hashed_password, role) 
VALUES (1, 1, 4, 'Alice Smith', 'alice@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Employee');

INSERT INTO users (client_id, branch_id, manager_id, name, email, hashed_password, role) 
VALUES (1, 1, 4, 'Bob Johnson', 'bob@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Employee');

-- 3. Create Employees reporting to Sarah Night-Lead (User ID: 6)
INSERT INTO users (client_id, branch_id, manager_id, name, email, hashed_password, role) 
VALUES (1, 1, 6, 'Charlie Brown', 'charlie@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Employee');

INSERT INTO users (client_id, branch_id, manager_id, name, email, hashed_password, role) 
VALUES (1, 1, 6, 'Diana Prince', 'diana@xyztech.com', '$2a$10$7R9K.y9Wl1z.M3N.kS5Ue.m8pQv6h7G8i9J0kL1mN2oP3qR4sT5uV', 'Employee');

-- 4. Assign these users to Rosters (Shift Mapping)
-- Assuming Shift IDs: Day Shift = 1, Night Shift = 2
-- Mapping Alice and Bob to Day Shift
INSERT INTO rosters (employee_id, client_id, shift_id, roster_date) VALUES (7, 1, 1, '2026-01-22');
INSERT INTO rosters (employee_id, client_id, shift_id, roster_date) VALUES (8, 1, 1, '2026-01-22');
INSERT INTO rosters (employee_id, client_id, shift_id, roster_date) VALUES (5, 1, 1, '2026-01-22');
-- Mapping Charlie and Diana to Night Shift
INSERT INTO rosters (employee_id, client_id, shift_id, roster_date) VALUES (9, 1, 2, '2026-01-22');
INSERT INTO rosters (employee_id, client_id, shift_id, roster_date) VALUES (10, 1, 2, '2026-01-22');





-- Comprehensive 2026 Indian Holiday List
INSERT INTO public.holiday_calendars (client_id, branch_id, holiday_date, name, is_flexi, year)
VALUES 
    -- 🇮🇳 Three Mandatory National Holidays
    (1, NULL, '2026-01-26', 'Republic Day', false, 2026),
    (1, NULL, '2026-08-15', 'Independence Day', false, 2026),
    (1, NULL, '2026-10-02', 'Gandhi Jayanti', false, 2026),

    -- 🗓️ Major Gazetted/Festival Holidays
    (1, NULL, '2026-01-01', 'New Year''s Day', false, 2026),
    (1, NULL, '2026-01-30', 'Id-ul-Fitr (Ramadan Eid)', false, 2026),
    (1, NULL, '2026-03-04', 'Holi', false, 2026),
    (1, NULL, '2026-03-27', 'Ram Navami', false, 2026),
    (1, NULL, '2026-04-02', 'Mahavir Jayanti', false, 2026),
    (1, NULL, '2026-04-03', 'Good Friday', false, 2026),
    (1, NULL, '2026-04-08', 'Id-ul-Zuha (Bakrid)', false, 2026),
    (1, NULL, '2026-05-01', 'May Day / Labour Day', false, 2026),
    (1, NULL, '2026-05-01', 'Budh Purnima', false, 2026),
    (1, NULL, '2026-07-07', 'Muharram', false, 2026),
    (1, NULL, '2026-08-26', 'Janmashtami', false, 2026),
    (1, NULL, '2026-09-05', 'Milad-un-Nabi', false, 2026),
    (1, NULL, '2026-10-20', 'Dussehra (Mahanavami)', false, 2026),
    (1, NULL, '2026-10-21', 'Vijaya Dashami', false, 2026),
    (1, NULL, '2026-11-08', 'Diwali (Deepavali)', false, 2026),
    (1, NULL, '2026-11-24', 'Guru Nanak Jayanti', false, 2026),
    (1, NULL, '2026-12-25', 'Christmas Day', false, 2026),

    -- 📍 Branch Specific (Example: Karnataka)
    (1, 1, '2026-01-14', 'Makar Sankranti / Pongal', false, 2026),
    (1, 1, '2026-11-01', 'Kannada Rajyotsava', false, 2026),

    -- 🧘 Flexi/Restricted Holiday Examples
    (1, NULL, '2026-02-15', 'Maha Shivaratri', true, 2026),
    (1, NULL, '2026-04-14', 'Ambedkar Jayanti', true, 2026);