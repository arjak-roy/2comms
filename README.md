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
3.  **Holiday Awareness:** The engine cross-references the `holiday_calendars` and `weekly_offs` before flagging an absence.



### Server-Side Geofencing
To prevent "proxy attendance," the backend does not trust the mobile device's location status alone.
* **Haversine Formula:** Upon every `/punch` request, the backend retrieves the branch coordinates and recalculates the distance. Access is granted only if the distance is within the defined `radius_meters`.

---

## 🛣️ API Documentation

### **1. Authentication (Auth Routes)**
| Endpoint | Method | Request Body | Success Response (200 OK) |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | `{ "email", "password" }` | `{ "token", "user": { "id", "role", "client_id", "name" } }` |
| `/api/auth/logout` | `POST` | None (Header Token) | `{ "success": true, "message": "Logged out" }` |
| `/api/auth/me` | `GET` | None (Header Token) | `{ "isAuthenticated": true, "user": { "id", "name", "role" } }` |

### **2. Employee Portal (Mobile Integration)**
| Endpoint | Method | Request Body | Key Output Data |
| :--- | :--- | :--- | :--- |
| `/punch` | `POST` | `{ "type", "lat", "lng", "selfieUrl" }` | `{ "punchTime", "isLate": bool }` |
| `/today-roster` | `GET` | None | `{ "shiftStart", "shiftEnd", "lat", "lng", "radius" }` |
| `/my-history` | `GET` | None | `Array of [{ "date", "status", "totalHours" }]` |
| `/request` | `POST` | `{ "type", "details": { "start_date", "end_dae", "reason" } }` | `{ "requestId", "status": "Pending" }` |
| `/my-requests` | `GET` | None | `Array of [{ "type", "status", "appliedOn" }]` |

### **3. HR & Management Operations**
| Endpoint | Method | Request Body | Key Output Data |
| :--- | :--- | :--- | :--- |
| `/attendance/snapshot` | `POST` | None | `{ "presentCount", "absentCount", "lateCount", "halfDayCount", "leaveCount" }` |
| `/attendance/absentees` | `GET` | None | `Array of [{ "name", "designation", "punch_time", "punch_type" }]` |
| `/request/action` | `POST` | `{ "requestId", "action", "comments" }` | `{ "success": true, "data": { "id", "status", "updated_at" } }` |



### **4. Super Admin Operations**
| Endpoint | Method | Request Body | Key Output Data |
| :--- | :--- | :--- | :--- |
| `/api/clients` | `POST` | `{ "name", "domain", "ot_config" }` | `{ "clientId", "message": "Tenant created" }` |
| `/api/createUsers` | `POST` | `{ "name", "email", "role", "client_id" }` | `{ "userId", "message": "User created" }` |

---

## 🛠️ Notable Challenges & Solutions

* **Atomic Leave Deductions:** Used **SQL Transactions** (`BEGIN/COMMIT`) and conditional updates to ensure balances never drop below zero during concurrent approvals.
* **Lateness Precision:** Solved timezone/type mismatches by explicitly casting `punch_time::time` against `shift_start + grace_period` in the repository layer.
* **Dynamic Routing:** Implemented a state-aware approval chain that tracks `current_level` in the `approval_requests` table to support hierarchical authorization (Manager -> HR).

---

## 🏗️ Setup & Installation
1.  **Clone:** `git clone <repo-url>`
2.  **Install:** `npm install`
3.  **Environment:** Configure `.env` with `DATABASE_URL`, `PORT`, and `JWT_SECRET`.
4.  **Run:** `npm start` (The Cron Job initializes automatically on startup).

---
**Project developed as a part of an internship assessment.**
