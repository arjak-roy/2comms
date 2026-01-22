const db = require('../config/db-config');

class AttendanceRepository {
    // Record punch-in/out with location validation [cite: 15, 18]
    async recordPunch(clientId, employeeId, punchData) {
        const { type, location_type, lat, lng, selfieUrl } = punchData;
        //geofence logic here
        const query = `
            INSERT INTO attendance_punches (
                employee_id, client_id, punch_type, location_type, latitude, longitude, selfie_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [
            employeeId, clientId, type, location_type, lat, lng, selfieUrl
        ]);
        return rows[0];
    }

    // Daily snapshot for managers (1 hour after shift start) [cite: 29, 30]
    async getDailySnapshot(clientId, date) {
        const query = `
            SELECT 
                u.name, u.designation, ap.location_type, ap.punch_time,
                CASE 
                    WHEN ap.punch_time::time > (s.start_time + (s.grace_period_mins || ' minutes')::interval) THEN true 
                    ELSE false 
                END as is_late
            FROM users u
            JOIN attendance_punches ap ON u.id = ap.employee_id
            JOIN rosters r ON u.id = r.employee_id AND r.roster_date = $2
            JOIN shifts s ON r.shift_id = s.id
            WHERE u.client_id = $1 AND ap.punch_type = 'IN' 
            AND DATE(ap.punch_time) = ${date? `$2` : `CURRENT_DATE`};
        `;
        const { rows } = await db.query(query, [clientId, date]);
        return rows;
    }

    // HR Regularization: Manual status override [cite: 33, 37, 43]
    async updateAttendance(clientId, employeeId, data) {
        try {
            const { date, status, total_hours, is_late } = data;
            const query = `
                INSERT INTO daily_attendance_summary (employee_id, client_id, summary_date, status, total_hours, is_late)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (employee_id, summary_date) 
                DO UPDATE SET status = $4, total_hours = $5, is_late = $6
                RETURNING *;
            `;
            const { rows } = await db.query(query, [employeeId, clientId, date, status, total_hours,is_late]);
            return rows[0];
        } catch (error) {
            throw error;
        }
    }
    /**
     * Processes an absence by either applying Loss of Pay (LOP) 
     * or deducting from the employee's leave balance.
     */
async processAbsence(attendanceId, employeeId, action) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify the attendance record exists for this employee
        const checkQuery = `
            SELECT id FROM daily_attendance_summary 
            WHERE id = $1 AND employee_id = $2
        `;
        const checkRes = await client.query(checkQuery, [attendanceId, employeeId]);
        
        if (checkRes.rows.length === 0) {
            throw new Error("Attendance record not found for this employee.");
        }

        let finalStatus = 'Absent';

        if (action === 'LEAVE_ADJUST') {
            // 2. Atomic Update: Deduct 1 day from balance ONLY if they have >= 1 day
            const balanceUpdate = await client.query(
                `UPDATE leave_balances 
                 SET balance_days = balance_days - 1 
                 WHERE employee_id = $1 
                 AND leave_type_name = 'Paid Leave' 
                 AND balance_days >= 1 
                 RETURNING balance_days`,
                [employeeId]
            );

            if (balanceUpdate.rows.length === 0) {
                throw new Error("Insufficient Paid Leave balance.");
            }
            finalStatus = 'Leave';
        } else if (action === 'LOP') {
            finalStatus = 'Absent'; // LOP usually stays as 'Absent' for payroll processing
        }

        // 3. Update the specific day's summary
        const updateSummaryQuery = `
            UPDATE daily_attendance_summary 
            SET status = $1, 
                total_hours = 0, -- Absence usually implies 0 worked hours
                is_late = false 
            WHERE id = $2
            RETURNING *
        `;
        const { rows } = await client.query(updateSummaryQuery, [finalStatus, attendanceId]);

        await client.query('COMMIT');
        return rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}
    async generateReport(clientId, filters) {
        const { type, branchId, view } = filters;

        let queryParams = [clientId];
        let branchFilter = "";
        let timeFilter = "";

        // 1. Handle Branch Filtering
        if (branchId && branchId !== 'all') {
            queryParams.push(branchId);
            branchFilter = `AND u.branch_id = $${queryParams.length}`;
        }

        // 2. Handle Time View Filtering
        // 'view' can be 'DAY', 'WEEK', or 'MONTH'
        if (view === 'DAY') {
            timeFilter = `AND p.punch_time::date = CURRENT_DATE`;
        } else if (view === 'WEEK') {
            timeFilter = `AND p.punch_time >= DATE_TRUNC('week', CURRENT_DATE)`;
        } else {
            // Default to MONTH
            timeFilter = `AND p.punch_time >= DATE_TRUNC('month', CURRENT_DATE)`;
        }

        if (type === 'ATTENDANCE') {
            const query = `
                SELECT 
                    u.name as employee_name,
                    u.designation,
                    b.name as branch_name,
                    p.punch_date,
                    MIN(p.punch_time) FILTER (WHERE p.punch_type = 'IN') as in_time,
                    MAX(p.punch_time) FILTER (WHERE p.punch_type = 'OUT') as out_time,
                    -- Calculated metrics for the report
                    CASE 
                        WHEN MIN(p.punch_time) FILTER (WHERE p.punch_type = 'IN') IS NOT NULL 
                        THEN 'Present' ELSE 'Absent' 
                    END as attendance_status
                FROM users u
                JOIN branches b ON u.branch_id = b.id
                LEFT JOIN (
                    SELECT *, punch_time::date as punch_date 
                    FROM attendance_punches 
                    WHERE client_id = $1
                ) p ON u.id = p.employee_id
                WHERE u.client_id = $1 
                ${branchFilter} 
                ${timeFilter}
                GROUP BY u.id, u.name, u.designation, b.name, p.punch_date
                ORDER BY p.punch_date DESC;
            `;
            const { rows } = await db.query(query, queryParams);
            return rows;

        } else if (type === 'LEAVE') {
            // Adjusted time filter for leaves based on start_date
            let leaveTimeFilter = (view === 'DAY')
                ? "AND l.start_date <= CURRENT_DATE AND l.end_date >= CURRENT_DATE"
                : (view === 'WEEK') ? "AND l.start_date >= DATE_TRUNC('week', CURRENT_DATE)"
                    : "AND l.start_date >= DATE_TRUNC('month', CURRENT_DATE)";

            const query = `
                SELECT u.name, l.type, l.start_date, l.end_date, l.status
                FROM users u
                JOIN leaves l ON u.id = l.employee_id
                WHERE u.client_id = $1 ${branchFilter} ${leaveTimeFilter}
                ORDER BY l.start_date DESC;
            `;
            const { rows } = await db.query(query, queryParams);
            return rows;
        }
    }
    async getEmployeeHistory(employeeId, month, year) {
        // If month/year aren't provided, default to current month
        const targetMonth = month || "EXTRACT(MONTH FROM CURRENT_DATE)";
        const targetYear = year || "EXTRACT(YEAR FROM CURRENT_DATE)";

        const query = `
            SELECT 
                summary_date, 
                status, 
                total_hours, 
                is_late,
                (SELECT JSON_AGG(p) FROM (
                    SELECT punch_time, punch_type, location_type 
                    FROM attendance_punches 
                    WHERE employee_id = $1 AND punch_time::date = das.summary_date
                    ORDER BY punch_time ASC
                ) p) as raw_punches
            FROM daily_attendance_summary das
            WHERE employee_id = $1 
            AND EXTRACT(MONTH FROM summary_date) = ${targetMonth}
            AND EXTRACT(YEAR FROM summary_date) = ${targetYear}
            ORDER BY summary_date DESC;
        `;

        const { rows } = await db.query(query, [employeeId]);
        return rows;
    }

    /**
     * Fetch today's roster and shift details for an employee
     * Used by the Flutter app to display "Shift: 9:00 AM - 6:00 PM" and for Geofencing
     */
    async getTodayRoster(employeeId) {
        const query = `
            SELECT 
                r.roster_date, 
                r.is_wfh,
                s.name as shift_name,
                s.start_time, 
                s.end_time, 
                s.grace_period_mins,
                b.name as branch_name,
                b.latitude, 
                b.longitude, 
                b.radius_meters
            FROM rosters r
            JOIN shifts s ON r.shift_id = s.id
            JOIN users u ON r.employee_id = u.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE r.employee_id = $1 
            AND r.roster_date = CURRENT_DATE;
        `;

        const { rows } = await db.query(query, [employeeId]);
        return rows[0] || null;
    }
    async getDailySnapshotByManager(managerId, date) {
        const query = `
        SELECT u.name, u.designation, ap.punch_time, ap.punch_type
        FROM users u
        LEFT JOIN attendance_punches ap ON u.id = ap.employee_id AND ap.punch_time::date = $2
        WHERE u.manager_id = $1
    `;
        const { rows } = await db.query(query, [managerId, date || 'CURRENT_DATE']);
        return rows;
    }
}

module.exports = new AttendanceRepository();