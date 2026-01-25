const cron = require('node-cron');
const db = require('../config/db-config');
const calculateInterval = require('../utils/calculate-intervals');

// Schedule the job to run every day at 5:00 AM
cron.schedule('0 5 * * *', async () => {
    console.log('--- Starting Daily Attendance Reconciliation ---');
    
    try {
        // 1. Target the previous day for reconciliation
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() - 1);
        const dateString = targetDate.toISOString().split('T')[0];

        // 2. Fetch all employees scheduled in the roster for the target date
        // We join shifts and branches to determine lateness based on specific rules
        const rosterQuery = `
            SELECT 
                r.employee_id, 
                r.client_id, 
                s.start_time, 
                s.grace_period_mins,
                b.allow_branch_overrides,
                b.branch_rules->>'grace_period' as branch_grace
            FROM rosters r
            JOIN shifts s ON r.shift_id = s.id
            JOIN users u ON r.employee_id = u.id
            JOIN branches b ON u.branch_id = b.id
            WHERE r.roster_date = $1;
        `;
        
        const { rows: scheduledEmployees } = await db.query(rosterQuery, [dateString]);

        for (const employee of scheduledEmployees) {
            const { employee_id, client_id, start_time, grace_period_mins, allow_branch_overrides, branch_grace } = employee;

            // 3. Get all punches for this employee on the target date
            const punchQuery = `
                SELECT punch_time, punch_type 
                FROM attendance_punches 
                WHERE employee_id = $1 AND client_id = $2 AND punch_time::date = $3
                ORDER BY punch_time ASC;
            `;
            const { rows: punches } = await db.query(punchQuery, [employee_id, client_id, dateString]);

            let status = 'Absent';
            let total_hours = 0;
            let is_late = false;

            if (punches.length > 0) {
                // 4. Calculate total worked hours using the existing utility
                total_hours = calculateInterval.calculateIntervals(punches);
                status = total_hours > 0 ? 'Present' : 'Absent';

                // 5. Check if the first 'IN' punch was late
                const firstIn = punches.find(p => p.punch_type === 'IN');
                if (firstIn) {
                    const effectiveGrace = (allow_branch_overrides && branch_grace) ? parseInt(branch_grace) : grace_period_mins;
                    
                    // Logic to compare punch time against shift start + grace
                    const punchTimeOnly = firstIn.punch_time.toTimeString().split(' ')[0];
                    const [sh, sm, ss] = start_time.split(':').map(Number);
                    const shiftStartMs = (sh * 3600 + sm * 60 + ss) * 1000;
                    
                    const [ph, pm, ps] = punchTimeOnly.split(':').map(Number);
                    const punchMs = (ph * 3600 + pm * 60 + ps) * 1000;

                    if (punchMs > (shiftStartMs + (effectiveGrace * 60 * 1000))) {
                        is_late = true;
                    }
                }
            }

            // 6. UPSERT into daily_attendance_summary
            const upsertQuery = `
                INSERT INTO daily_attendance_summary (employee_id, client_id, summary_date, status, total_hours, is_late)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (employee_id, summary_date) 
                DO UPDATE SET status = $4, total_hours = $5, is_late = $6
                RETURNING *;
            `;
            
            await db.query(upsertQuery, [employee_id, client_id, dateString, status, total_hours, is_late]);
        }

        console.log(`Successfully reconciled attendance for ${dateString}`);
    } catch (error) {
        console.error('Error in daily attendance cron job:', error);
    }
});