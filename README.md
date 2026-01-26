# 🏢 Multi-Tenant HRMS (Attendance & Payroll)

An enterprise-grade, multi-tenant Human Resource Management System (HRMS) core designed for automated attendance reconciliation and payroll readiness. Built with **Node.js**, **Express**, and **PostgreSQL**, this backend acts as the secure engine for a Geofenced **Flutter** mobile app and a **React** administrative console.

## 🚀 Key Technical Features

### 1. Robust Authorization & Multi-Tenant Security
The system implements a rigorous data isolation model to ensure Tenant A can never access Tenant B’s records:
* **Layered Middleware:** Uses `auth-middleware.js` for JWT validation and `role-auth.js` for RBAC (Role-Based Access Control) across Super Admin, Admin, HR, and Employee levels.
* **Tenant-Scoped Repositories:** Every SQL query in the repository layer is explicitly scoped with a `client_id` extracted from the authenticated JWT.



### 2. High-Performance Schema Design
The PostgreSQL schema is optimized for both transactional integrity and flexible policy management:
* **JSONB Policies:** Shift rules, weekly offs, and overtime configurations are stored as `JSONB` to allow dynamic rule updates without schema migrations.
* **Roster-Punch Mapping:** A sophisticated relational link between `rosters`, `shifts`, and `attendance_punches` drives the reconciliation logic.



---

## 📊 Business Logic & Algorithms

### Nightly Reconciliation Engine (The "5 AM Cron")
To eliminate manual tracking, the system uses a **Materialized Absence** strategy:
1.  **Automation:** A `node-cron` job executes daily at 5:00 AM. It performs a `LEFT JOIN` between the expected `rosters` and actual `attendance_punches`.
2.  **Absence Generation:** If an employee has a roster but zero punches, the system explicitly inserts an `Absent` record into the `daily_attendance_summary`.
3.  **Holiday Awareness:** The engine cross-references the `holiday_calendars` and `weekly_offs` (from the shift JSON) before flagging an absence.



### Server-Side Geofencing
To prevent "proxy attendance," the backend does not trust the mobile device's location status alone.
* **Haversine Formula:** Upon every `/punch` request, the backend retrieves the branch coordinates and recalculates the distance between the employee and the branch.
* **Validation:** Access is only granted if the calculated distance is within the defined `radius_meters`.



---

## 🛣️ API Documentation Snapshot

### **1. Authentication**
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Tenant-aware login; returns JWT and user metadata. |
| `/api/auth/me` | `GET` | Validates current session and returns user profile. |

### **2. Employee Portal (Flutter Integration)**
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/employee/today-roster` | `GET` | Fetches geofence coordinates, branch info, and shift timings. |
| `/employee/punch` | `POST` | Records attendance with GPS and selfie verification. |
| `/employee/request` | `POST` | Initiates Leave or Swipe (Regularization) requests. |

### **3. Management & Operations (React Console)**
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/hr/request/action` | `POST` | Processes L1/L2 approvals for managers and HR. |
| `/hr/cycle/finalize` | `POST` | Freezes data for the payroll cycle to prevent backdated edits. |



---

## 🛠️ Notable Challenges & Solutions

* **Atomic Leave Deductions:** Used **SQL Transactions** (`BEGIN/COMMIT`) to ensure that approving a leave request and deducting the balance happen as a single, unbreakable operation.
* **Lateness Precision:** Solved timezone/type mismatches by explicitly casting `punch_time::time` against `shift_start + grace_period` in the repository layer.
* **Multi-Level Approvals:** Implemented a state-aware approval chain that tracks `current_level` in the `approval_requests` table to support hierarchical authorization.

---

## 🏗️ Setup & Installation
1.  **Clone:** `git clone <repo-url>`
2.  **Install:** `npm install`
3.  **Environment:** Configure `.env` with `DATABASE_URL`, `PORT`, and `JWT_SECRET`.
4.  **Database:** Initialize the schema using the SQL provided in `/database/schema.sql`.
5.  **Run:** `npm start` (The Cron Job initializes automatically on startup).

---
**Project developed as a part of an internship assessment.**