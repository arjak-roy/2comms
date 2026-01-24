const db = require('../config/db-config') // Importing your centralized query method

class UserRepository {
    /**
     * Find user by email (Global lookup for login)
     */
    async findByEmail(email) {
        const query = `
            SELECT id, name, email, hashed_password, role, client_id, branch_id 
            FROM users 
            WHERE email = $1 AND is_active = TRUE
            LIMIT 1;
        `;
        const { rows } = await db.query(query, [email]);
        return rows[0];
    }

    /**
     * Find user by ID (Scoped by client_id for multi-tenant security)
     */
    async findById(userId, clientId) {
        const query = `
            SELECT id, name, email, role, branch_id, manager_id 
            FROM users 
            WHERE id = $1 AND client_id = $2;
        `;
        const { rows } = await db.query(query, [userId, clientId]);
        return rows[0];
    }

    /**
     * Find the HR Manager for a specific Client (Tenant)
     */
    async findHRByClientId(clientId) {
        const query = `
            SELECT id, name, email 
            FROM users 
            WHERE client_id = $1 AND role = 'HR' AND is_active = TRUE
            LIMIT 1;
        `;
        const { rows } = await db.query(query, [clientId]);
        return rows[0];
    }

    /**
     * Get all employees for a specific manager's snapshot
     */
    async findByManager(managerId, clientId) {
        const query = `
            SELECT id, name, email, role, branch_id 
            FROM users 
            WHERE manager_id = $1 AND client_id = $2;
        `;
        const { rows } = await db.query(query, [managerId, clientId]);
        return rows;
    }

    /**
     * Admin Action: Create new User
     */
    async create(userData) {
        const { name, email, hashedPassword, role, client_id, branch_id, manager_id } = userData;
        console.log(userData);
        const query = `
            INSERT INTO users (name, email, hashed_password, role, client_id, branch_id, manager_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, email, role, client_id;
        `;
        const values = [name, email, hashedPassword, role, client_id, branch_id, manager_id];
        const { rows } = await db.query(query, values);
        return rows[0];
    }


async createEmployee(userData) {
    const client = db;
    try {
        await client.query('BEGIN');

        // 1. Insert the Employee
        const userQuery = `
            INSERT INTO users (name,hashed_password ,email, role, client_id, branch_id, manager_id)
            VALUES ($1, $2, $3 ,'Employee', $4, $5, $6)
            RETURNING id;
        `;
        const userRes = await client.query(userQuery, [
            userData.name, userData.hashedPassword ,userData.email,userData.client_id, userData.branch_id, userData.manager_id
        ]);
        const newUserId = userRes.rows[0].id;

        // 2. Initialize Leave Balances
        // You can fetch these types from a config or use these standard defaults
        const defaultLeaveTypes = [
            { name: 'Paid Leave', initial: 12 }, 
            { name: 'Sick Leave', initial: 6 },
            { name: 'Casual Leave', initial: 6 }
        ];

        for (const leave of defaultLeaveTypes) {
            await client.query(
                `INSERT INTO leave_balances (employee_id, client_id, leave_type_name, balance_days)
                 VALUES ($1, $2, $3, $4)`,
                [newUserId, userData.client_id, leave.name, leave.initial]
            );
        }

        await client.query('COMMIT');
        return userRes.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
    }
}
/**
 * Handles the transfer of an employee to a new client.
 * Enforces the "Fresh Start" rule by lapsing all old leave data.
 */
async transferEmployee(employeeData) {
    // Acquire a specific client from the pool for the transaction
    const client = db; 
    
    try {
        const { employeeId, newClientId, newBranchId, newManagerId } = employeeData;

        await client.query('BEGIN');

        // 1. Reset balances for the OLD client records
        await client.query(
            `UPDATE leave_balances 
             SET balance_days = 0, accrued_this_cycle = 0 
             WHERE employee_id = $1`,
            [employeeId]
        );

        // 2. Expire future requests
        await client.query(
            `UPDATE approval_requests 
             SET status = 'Expired' 
             WHERE requester_id = $1 
             AND status = 'Approved' 
             ---AND (start_date)::date > CURRENT_DATE`,
            [employeeId]
        );

        // 3. Update the employee's main record
        const updateQuery = `
            UPDATE users 
            SET client_id = $1, 
                branch_id = $2, 
                manager_id = $3 
            WHERE id = $4 
            RETURNING *;
        `;
        const { rows } = await client.query(updateQuery, [
            newClientId, 
            newBranchId, 
            newManagerId, 
            employeeId
        ]);
        const defaultLeaveTypes = [
            { name: 'Paid Leave', initial: 12 }, 
            { name: 'Sick Leave', initial: 6 },
            { name: 'Casual Leave', initial: 6 }
        ];

        for (const leave of defaultLeaveTypes) {
            await client.query(
                `INSERT INTO leave_balances (employee_id, client_id, leave_type_name, balance_days)
                 VALUES ($1, $2, $3, $4)`,
                [employeeId, newClientId, leave.name, leave.initial]
            );
        }

        await client.query('COMMIT');
        return rows[0];

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Transfer Error:", error);
        throw error;
    } finally {
        // Always release the client back to the pool
    }
}
async updateCycleStatus(clientId, cycleId, status) {
    // Status can be 'Open', 'Locked', or 'Frozen' 
    const query = `
        UPDATE attendance_cycles 
        SET 
            status = $1, 
            frozen_at = CASE WHEN $1 = 'Frozen' THEN CURRENT_TIMESTAMP ELSE frozen_at END,
            locked_at = CASE WHEN $1 = 'Locked' THEN CURRENT_TIMESTAMP ELSE locked_at END
        WHERE id = $2 
          AND client_id = $3 
          AND (status = 'Open' OR status = 'Locked') -- Ensures client isolation and state flow
          AND status != 'Frozen' -- Prevents modifications once audit is finalized 
        RETURNING *;
    `;
    const { rows } = await db.query(query, [status, cycleId, clientId]);
    return rows[0];
}
async getEmployeesByClient(clientId) {
    const query = `
        SELECT id, name, email, role, branch_id 
        FROM users 
        WHERE client_id = $1 AND role = 'Employee';
    `;
    const { rows } = await db.query(query, [clientId]);
    return rows;

}
}

module.exports = new UserRepository();