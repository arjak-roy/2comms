const db = require('../config/db-config');

class ClientRepository {
    // Create a new Tenant/Company
    async getAllClients() {
        try {
            const query = `SELECT * FROM clients`;
            const { rows } = await db.query(query);
            return rows;

        } catch (error) {
            throw error;
        }
    }
    async createClient(name, entity_id) {
        const query = `
            INSERT INTO clients (name, entity_id)
            VALUES ($1, $2)
            RETURNING *;
        `;
        const { rows } = await db.query(query, [name, entity_id]);
        return rows[0];
    }

    // Add a physical location to a Client
    async createBranch(clientId, branchData) {
        const { name, latitude, longitude, radius_meters, address } = branchData;
        const query = `
            INSERT INTO branches (client_id, name, latitude, longitude, radius_meters, address)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const values = [clientId, name, latitude, longitude, radius_meters, address];
        const { rows } = await db.query(query, values);
        return rows[0];
    }

    // Fetch all branches for a specific client (used in dropdowns)
    async getBranchesByClient(clientId) {
        const query = `SELECT * FROM branches WHERE client_id = $1`;
        const { rows } = await db.query(query, [clientId]);
        console.log(clientId);
        return rows;
    }


    async updateClientRules(clientId, ruleData) {
        const {
            attendance_cycle_start,
            attendance_cycle_end,
            ot_config,
            leave_policy_config,
            geo_fencing_enabled
        } = ruleData;

        const query = `
            UPDATE clients 
            SET 
                attendance_cycle_start = COALESCE($2, attendance_cycle_start),
                attendance_cycle_end = COALESCE($3, attendance_cycle_end),
                ot_config = COALESCE($4, ot_config),
                leave_policy_config = COALESCE($5, leave_policy_config),
                geo_fencing_enabled = COALESCE($6, geo_fencing_enabled)
            WHERE id = $1
            RETURNING *;
        `;
        const values = [
            clientId,
            attendance_cycle_start,
            attendance_cycle_end,
            ot_config,
            leave_policy_config,
            geo_fencing_enabled
        ];

        const { rows } = await db.query(query, values);
        return rows[0];
    }

    /**
     * Updates branch-specific rules and toggles the override permission.
     * Only applies if the client has specifically allowed branch-wise differences.
     */
    async updateBranchRules(branchId, clientId, branchData) {
        const { allow_branch_overrides, branch_rules } = branchData;

        const query = `
        UPDATE branches 
        SET 
            -- Explicitly handle boolean and JSONB casting
            allow_branch_overrides = CASE 
                WHEN $3::boolean IS NULL THEN allow_branch_overrides 
                ELSE $3::boolean 
            END,
            branch_rules = CASE 
                WHEN $4::jsonb IS NULL THEN branch_rules 
                ELSE $4::jsonb 
            END
        WHERE id = $1 AND client_id = $2
        RETURNING *;
    `;

        // Ensure branch_rules is a stringified JSON if it's an object
        const formattedRules = (branch_rules && typeof branch_rules === 'object')
            ? JSON.stringify(branch_rules)
            : branch_rules;

        const values = [
            branchId,
            clientId,
            allow_branch_overrides ?? null, // Use nullish coalescing
            formattedRules ?? null
        ];

        try {
            const { rows } = await db.query(query, values);

            if (rows.length === 0) {
                console.error(`Update failed: Branch ${branchId} not found for Client ${clientId}`);
                return null;
            }

            return rows[0];
        } catch (error) {
            console.error("Database Error in updateBranchRules:", error);
            throw error;
        }
    }
}

module.exports = new ClientRepository();