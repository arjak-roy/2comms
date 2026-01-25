const db = require('../config/db-config');

class RosterRepository {
    /**
     * Bulk sets or updates rosters for multiple employees
     * Uses ON CONFLICT to allow updating existing schedules
     */
    async setBulkRoster(clientId, rosterData) {
        // rosterData: Array of { employee_id, shift_id, roster_date, is_wfh, location_id }
        const client = await db.db_client.connect();
        try {
            await client.query('BEGIN');
            const results = [];

            for (const entry of rosterData) {
                const query = `
                    INSERT INTO rosters (employee_id, client_id, shift_id, roster_date, is_wfh, location_id)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (employee_id, roster_date) 
                    DO UPDATE SET 
                        shift_id = EXCLUDED.shift_id,
                        is_wfh = EXCLUDED.is_wfh,
                        location_id = EXCLUDED.location_id
                    RETURNING *;
                `;
                const values = [
                    entry.employee_id,
                    clientId,
                    entry.shift_id,
                    entry.roster_date,
                    entry.is_wfh || false,
                    entry.location_id
                ];
                const { rows } = await client.query(query, values);
                results.push(rows[0]);
            }

            await client.query('COMMIT');
            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Fetches the specific roster and shift rules for an employee on a given date
     * Used by the /today-roster endpoint for geofencing validation
     */
    async getEmployeeRoster(employeeId, date) {
        const query = `
            SELECT 
                r.roster_date,
                r.is_wfh,
                s.shift_name,
                s.start_time,
                s.end_time,
                s.grace_period_mins,
                b.name as branch_name,
                b.latitude,
                b.longitude,
                b.radius_meters
            FROM rosters r
            JOIN shifts s ON r.shift_id = s.id
            JOIN branches b ON r.location_id = b.id
            WHERE r.employee_id = $1 AND r.roster_date = $2;
        `;
        const { rows } = await db.query(query, [employeeId, date]);
        return rows[0];
    }

    /**
     * Deletes a roster entry (useful for rescheduling)
     */
    async deleteRoster(employeeId, date) {
        const query = `DELETE FROM rosters WHERE employee_id = $1 AND roster_date = $2`;
        return await db.query(query, [employeeId, date]);
    }
}

module.exports = new RosterRepository();