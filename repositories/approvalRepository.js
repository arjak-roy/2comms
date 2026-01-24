const db = require('../config/db-config');

class ApprovalRepository {
    // Create request with 3-business-day SLA (Excluding Sundays) 
    async createRequest(clientId, requesterId, requestData) {
        const { type, details } = requestData;

        // SQL logic to calculate 3 business days (skipping Sundays)
        const slaQuery = `
            SELECT (CURRENT_TIMESTAMP + (
                CASE 
                    WHEN EXTRACT(DOW FROM CURRENT_TIMESTAMP) IN (4, 5, 6) THEN INTERVAL '4 days' 
                    ELSE INTERVAL '3 days' 
                END
            )) as expiry;
        `;
        const slaResult = await db.query(slaQuery);
        const expiry = slaResult.rows[0].expiry;

        const query = `
            INSERT INTO approval_requests (client_id, requester_id, type, details, sla_expiry)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [clientId, requesterId, type, details, expiry]);
        return rows[0];
    }

    // Advance request through L1, L2, L3 [cite: 45, 50, 51]
    async updateRequestStatus(requestId, userId, actionData) {
        const { status, comments } = actionData;

        const client = db;
        try {
            await client.query('BEGIN');

            // Log the history [cite: 65]

            // Update main request status
            const { rows } = await client.query(
                `UPDATE approval_requests 
                SET status = $1, current_level = current_level + 1
                WHERE id = $2 AND sla_expiry > CURRENT_TIMESTAMP
                RETURNING *`,
                [status, requestId]
            );
            await client.query(
                `INSERT INTO approval_history (request_id, approver_id, action, comments,level) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [requestId, userId, status, comments, rows[0].current_level]
            );

            await client.query('COMMIT');
            return rows[0];
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
        }
    }

    // Auto-expire requests past SLA 
    async expireOverdueRequests() {
        const query = `
            UPDATE approval_requests 
            SET status = 'Expired' 
            WHERE status = 'Pending' AND sla_expiry < CURRENT_TIMESTAMP;
        `;
        return await db.query(query);
    }

    async getRequestsByClient(clientId, filters = {}) {
        const { status, requesterId, type, minLevel, isManager } = filters;

        let queryParams = [clientId];
        let filterSQL = "";

        if (status) {
            queryParams.push(status);
            filterSQL += ` AND ar.status = $${queryParams.length}`;
        }
        if (requesterId) {
            queryParams.push(requesterId);
            filterSQL += ` AND ar.requester_id = $${queryParams.length}`;
        }
        if (type) {
            queryParams.push(type);
            filterSQL += ` AND ar.type = $${queryParams.length}`;
        }
        if (isManager) {
            queryParams.push(minLevel);
            filterSQL += ` AND ar.current_level = $${queryParams.length}`;
        }
        if (!isManager) {
            queryParams.push(minLevel);
            filterSQL += ` AND ar.current_level >= $${queryParams.length}`;
        }

        const query = `
            SELECT 
                ar.*, 
                u.name as requester_name, 
                u.email as requester_email,
                b.name as branch_name
            FROM approval_requests ar
            JOIN users u ON ar.requester_id = u.id
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE ar.client_id = $1 ${filterSQL}
            ORDER BY ar.created_at DESC;
        `;

        const { rows } = await db.query(query, queryParams);
        return rows;
    }

    /**
     * Identify requests approaching SLA deadline and notify approvers
     * Logic: Finds 'Pending' requests where SLA expires in less than 24 hours
     */
    async notifyPendingApprovers() {
        // This query identifies the current manager/approver for pending requests
        // and returns their contact details for the notification service
        try {
            const query = `
                SELECT 
                    ar.id as request_id,
                    ar.type as request_type,
                    ar.sla_expiry,
                    requester.name as employee_name,
                    approver.email as manager_email,
                    approver.name as manager_name
                FROM approval_requests ar
                JOIN users requester ON ar.requester_id = requester.id
                -- Logic: Link to the manager/approver based on current_level
                -- For Level 1, it's the manager_id; for L2/L3, it might be HR
                JOIN users approver ON (
                    CASE 
                        WHEN ar.current_level = 1 THEN requester.manager_id = approver.id
                        ELSE approver.role = 'HR' AND approver.client_id = ar.client_id
                    END
                )
                WHERE ar.status = 'Pending' 
                AND ar.sla_expiry > CURRENT_TIMESTAMP
                AND ar.sla_expiry < (CURRENT_TIMESTAMP + INTERVAL '24 hours');
            `;

            const { rows } = await db.query(query);
            console.log(rows);
            if (rows.length === 0) {
                //if SLA is not going to expire in 24 hours, return an empty array
                return [];
            }
            // Return this list so your Notification Service (Nodemailer/Firebase) can loop through them
            return rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new ApprovalRepository();