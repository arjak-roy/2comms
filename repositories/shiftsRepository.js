const db = require('../config/db-config');

class ShiftRepository {
    /**
     * Creates a new shift for a specific client
     * @param {Object} shiftData - { client_id, name, start_time, end_time, grace_period_mins, weekly_offs, late_coming_rules }
     */
    async createShift(shiftData) {
        const query = `
            INSERT INTO shifts (
                client_id, name, start_time, end_time, 
                grace_period_mins, weekly_offs, late_coming_rules
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [
            shiftData.client_id,
            shiftData.name,
            shiftData.start_time,
            shiftData.end_time,
            shiftData.grace_period_mins || 15,
            JSON.stringify(shiftData.weekly_offs || ["Sunday"]),
            JSON.stringify(shiftData.late_coming_rules || {})
        ];

        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Updates an existing shift and its associated rules
     */
    async updateShift(shiftId, clientId, updateData) {
        const query = `
            UPDATE shifts 
            SET 
                name = COALESCE($1, name),
                start_time = COALESCE($2, start_time),
                end_time = COALESCE($3, end_time),
                grace_period_mins = COALESCE($4, grace_period_mins),
                weekly_offs = COALESCE($5, weekly_offs),
                late_coming_rules = COALESCE($6, late_coming_rules)
            WHERE id = $7 AND client_id = $8
            RETURNING *;
        `;
        const values = [
            updateData.name,
            updateData.start_time,
            updateData.end_time,
            updateData.grace_period_mins,
            updateData.weekly_offs ? JSON.stringify(updateData.weekly_offs) : null,
            updateData.late_coming_rules ? JSON.stringify(updateData.late_coming_rules) : null,
            shiftId,
            clientId
        ];

        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Retrieves all shifts belonging to a specific client
     */
    async getShiftsByClient(clientId) {
        const query = `SELECT * FROM shifts WHERE client_id = $1 ORDER BY id ASC`;
        const { rows } = await db.query(query, [clientId]);
        return rows;
    }

    /**
     * Fetches a single shift by ID (Tenant Protected)
     */
    async getShiftById(shiftId, clientId) {
        const query = `SELECT * FROM shifts WHERE id = $1 AND client_id = $2`;
        const { rows } = await db.query(query, [shiftId, clientId]);
        return rows[0];
    }
}

module.exports = new ShiftRepository();