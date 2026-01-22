# Multi-Tenant HRMS Backend (Attendance & Payroll)

An enterprise-grade, multi-tenant Human Resource Management System (HRMS) focused on automated attendance tracking and payroll preparation. Built with **Node.js**, **Express**, and **PostgreSQL**, this backend serves as the core engine for both a Flutter mobile application and a React-based administrative dashboard.

## 🚀 Key Technical Features

### 1. Robust Authorization & Security
The system implements a dual-layer security model to ensure data isolation in a multi-tenant environment:
* **Authentication Middleware (`auth-middleware.js`):** Intercepts requests to validate JSON Web Tokens (JWT). It extracts the `user_id`, `role`, and `client_id` to populate the `req.user` object.
* **Role-Based Access Control (RBAC) (`role-auth.js`):** A sophisticated middleware that prevents unauthorized access by checking the authenticated user's role against an allowed list (e.g., `['Admin', 'HR']`).



### 2. Multi-Tenant Database Schema
Designed for strict data isolation, every table (except Super Admin tables) contains a `client_id` foreign key.
* **`users`**: Manages hierarchies using `manager_id`.
* **`attendance_punches`**: Stores raw GPS-verified logs, selfie URLs, and punch types (IN/OUT).
* **`daily_attendance_summary`**: The primary source for payroll, storing aggregated daily hours and status.
* **`leave_balances`**: Manages Paid, Sick, and Casual leave ledgers.



---

## 📊 Business Logic & Algorithms

### The "Total Days" & Absence Logic
Unlike basic systems, this backend does not calculate absence "on-the-fly." It uses a **Materialized Absence** strategy:
1.  **Nightly Cron Job:** A script runs daily at 00:05 AM. It performs a `LEFT JOIN` between the employee roster and the actual punches.
2.  **Absence Generation:** If an employee was supposed to work but has zero punches, the system explicitly inserts a row into `daily_attendance_summary` with the status `Absent`.
3.  **Regularization:** This physical record allows HR to later "Regularize" the day (converting an Absence to a 'Paid Leave' or 'Present') via the `processAbsence` logic.

### Punctuality Detection
The system identifies latecomers by casting the punch timestamp to a time object and comparing it against the shift start time:
`is_late = punch_time::time > (shift_start + grace_period)`



---

## 🛣️ API Documentation

### **Authentication**
* `POST /api/auth/login` - Tenant-aware authentication.
* `POST /api/auth/logout` - Secure session termination.

### **Employee Portal**
* `POST /api/employee/punch` - Records attendance with Geofencing verification.
* `GET /api/employee/my-history` - Fetches data for the mobile calendar view.
* `POST /api/employee/request` - Initiates Leave or Swipe regularization requests.

### **Management & Operations**
* `POST /api/hr/attendance/manage-absence` - Deducts from `leave_balances` or marks LOP.
* `POST /api/hr/cycle/finalize` - Freezes attendance data for the payroll cycle.
* `GET /api/hr/reports` - Generates CSV-ready monthly attendance data.

---

## 🛠️ Notable Challenges & Solutions

### **Challenge: Timezone & Data Type Mismatches**
**Problem:** PostgreSQL threw errors when comparing `Timestamp without timezone` (Punch) to `Time` (Shift Start).
**Solution:** Implemented explicit casting (`::time`) in the repository layer to ensure precision in lateness calculation regardless of the date.

### **Challenge: Atomic Leave Deductions**
**Problem:** Concurrent approval requests could lead to negative leave balances.
**Solution:** Utilized **SQL Transactions** (`BEGIN/COMMIT`) and conditional updates (`SET balance = balance - 1 WHERE balance >= 1`) to ensure atomic operations.



### **Challenge: Geofencing Reliability**
**Problem:** Relying only on the frontend for GPS verification is insecure.
**Solution:** The backend re-calculates the distance between the employee and the branch using the **Haversine Formula** on every punch request.

---

## 🏗️ Setup & Installation
1.  **Clone:** `git clone <repo-url>`
2.  **Install:** `npm install`
3.  **Environment:** Configure `.env` with `DATABASE_URL` and `JWT_SECRET`.
4.  **Database:** Execute the SQL scripts in `/database/schema.sql`.
5.  **Run:** `npm start` (The Cron Job will initialize automatically).

---
**Project developed as a part of an internship assesment.**
