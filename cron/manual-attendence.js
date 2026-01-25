const db = require('../config/db-config'); 
const calculateInterval = require('../utils/calculate-intervals'); 

/**
 * Manually reconciles attendance for specific dates with Holiday/Week-off awareness
 * @param {string} dateString - Format 'YYYY-MM-DD'
 */
async function reconcileDate(dateString) {
    console.log(`--- Reconciling: ${dateString} ---`);
    const client = await db.db_client.connect(); 

    try {
        const targetDate = new Date(dateString);
        // Get day name for week-off check (e.g., 'Sunday')
        const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

        await client.query('BEGIN');

        // 1. Fetch scheduled employees for this specific date
        const rosterQuery = `
            SELECT 
                r.employee_id, 
                r.client_id, 
                u.branch_id,
                s.start_time, 
                s.grace_period_mins,
                s.weekly_offs->>'data', 
                b.allow_branch_overrides,
                b.branch_rules->>'grace_period' as branch_grace
            FROM rosters r
            JOIN shifts s ON r.shift_id = s.id
            JOIN users u ON r.employee_id = u.id
            JOIN branches b ON u.branch_id = b.id
            WHERE r.roster_date = $1;
        `;
        const { rows: scheduledEmployees } = await client.query(rosterQuery, [dateString]);

        for (const emp of scheduledEmployees) {
            // 2. Fetch all punches for the employee on this date
            const { rows: punches } = await client.query(
                `SELECT punch_time, punch_type FROM attendance_punches 
                 WHERE employee_id = $1 AND punch_time::date = $2 ORDER BY punch_time ASC`,
                [emp.employee_id, dateString]
            );

            let status = 'Absent';
            let total_hours = 0;
            let is_late = false;

            if (punches.length > 0) {
                // 3. Calculate hours
                total_hours = calculateInterval.calculateIntervals(punches);
                status = total_hours > 0 ? 'Present' : 'Absent';

                // 4. Calculate Lateness
                const firstIn = punches.find(p => p.punch_type === 'IN');
                if (firstIn) {
                    const grace = (emp.allow_branch_overrides && emp.branch_grace) 
                                  ? parseInt(emp.branch_grace) : emp.grace_period_mins;
                    
                    const punchTime = firstIn.punch_time.toTimeString().split(' ')[0];
                    if (punchTime > addMinutes(emp.start_time, grace)) {
                        is_late = true;
                    }
                }
            } else {
                // --- NEW: HOLIDAY & WEEK-OFF CHECK FOR MANUAL PROCESSOR ---
                // Check for public holidays
                const holidayCheck = await client.query(
                    `SELECT id FROM holiday_calendars 
                     WHERE holiday_date = $1 AND (client_id = $2 OR branch_id = $3)`,
                    [dateString, emp.client_id, emp.branch_id]
                );

                if (holidayCheck.rows.length > 0) {
                    status = 'Holiday';
                } 
                // Check if the day is a configured weekly off in the shift
                else if (emp.weekly_offs && emp.weekly_offs.includes(dayName)) {
                    status = 'Holiday'; 
                }
            }

            // 5. UPSERT the summary
            await client.query(`
                INSERT INTO daily_attendance_summary (employee_id, client_id, summary_date, status, total_hours, is_late)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (employee_id, summary_date) 
                DO UPDATE SET status = $4, total_hours = $5, is_late = $6`,
                [emp.employee_id, emp.client_id, dateString, status, total_hours, is_late]
            );
        }

        await client.query('COMMIT');
        console.log(`DONE: ${dateString}`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`FAILED: ${dateString}`, error);
    } finally {
        client.release();
    }
}

function addMinutes(time, mins) {
    const [h, m, s] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + mins, s);
    return date.toTimeString().split(' ')[0];
}

// Command line execution logic
const args = process.argv.slice(2);
if (args.length > 0) {
    (async () => {
        for (const date of args) {
            await reconcileDate(date);
        }
        process.exit(0);
    })();
}

module.exports = { reconcileDate };