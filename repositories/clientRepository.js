const db = require('../config/db-config');

class ClientRepository {
    // Create a new Tenant/Company
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
        const { name, latitude, longitude, radiusMeter } = branchData;
        const query = `
            INSERT INTO branches (client_id, name, latitude, longitude, radius_meters)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [clientId, name, latitude, longitude, radiusMeter];
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
                allow_branch_overrides = COALESCE($3, allow_branch_overrides),
                branch_rules = COALESCE($4, branch_rules)
            WHERE id = $1 AND client_id = $2
            RETURNING *;
        `;
        const values = [branchId, clientId, allow_branch_overrides, branch_rules];
        
        const { rows } = await db.query(query, values);
        return rows[0];
    }
}

module.exports = new ClientRepository();