const clientRepo = require('../../repositories/clientRepository');
const userRepo = require('../../repositories/userRepository');
const bcrypt = require('bcryptjs');
const shiftRepo = require('../../repositories/shiftsRepository');
const rosterRepo = require('../../repositories/rosterRepository');

// Add a physical location to a Client
exports.createBranch = async (req, res) => {
    try {
        const { name, latitude, longitude, radius_meters, address } = req.body;
        const clientId = req.user.client_id; 

        const newBranch = await clientRepo.createBranch(clientId, {
            name, 
            latitude, 
            longitude, 
            radius_meters: radius_meters || 100, // Matches SQL column
            address
        });

        res.status(201).json({ success: true, data: newBranch });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error });
    }
};

//employee onboarding
exports.onboardEmployee = async (req, res) => {
    try {
        let { name, email, password, role, branch_id, designation, manager_id } = req.body;
        const clientId = req.user.client_id;

        if(role === 'Manager'){
            manager_id = null;
        }

        if(role === 'Employee'){
            designation = null;
        }

        if(role === 'Admin'){
            throw Error('Admins cannot be created by Admins');
        }

        if(role === 'Super Admin'){
            throw Error('SuperAdmins cannot be created');
        }


        const hashedPassword = await bcrypt.hash(password, 10);

        // Map to SQL-friendly keys
        const employee = await userRepo.createEmployee({
            name:name, 
            email: email, 
            hashedPassword: hashedPassword, // Match DB column
            role: role, 
            client_id: clientId, 
            branch_id: branch_id, 
            manager_id:manager_id, 
            designation:designation
        });

        res.status(201).json({ 
            success: true, 
            data: { id: employee.id, email: employee.email, role: employee.role } 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// Manage Client-wide Rules (OT, Leave, Attendance)
exports.updateClientRules = async (req, res) => {
    try {
        const { ot_config, leave_policy_config, attendance_cycle_start, attendance_cycle_end } = req.body;
        const clientId = req.user.client_id; // Client Admin scope

        const updatedClient = await clientRepo.updateClientRules(clientId, {
            ot_config, 
            leave_policy_config, 
            attendance_cycle_start,
            attendance_cycle_end
        });

        res.status(200).json({ success: true, data: updatedClient });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Configure Branch Overrides
exports.updateBranchRules = async (req, res) => {
    try {
        const { branch_rules, allow_branch_overrides, branchId } = req.body;
        console.log(req.body);
        // Ensure the branch belongs to the Admin's client
        const branch = await clientRepo.updateBranchRules(branchId, req.user.client_id, {
            branch_rules,
            allow_branch_overrides
        });

        res.status(200).json({ success: true, data: branch });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.transferEmployee = async (req, res) => {
    try {
        const { employeeId, newClientId, newBranchId, newManagerId } = req.body;
        // 1. Lapse old leave balances
        // 2. Expire future leaves
        // 3. Update client_id and branch_id
        const result = await userRepo.transferEmployee({employeeId, newClientId, newBranchId,newManagerId});
        res.status(200).json({ success: true, message: "Employee transferred and balances reset.", result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.finalizeCycle = async (req, res) => {
    try {
        const { status } = req.body; // 'LOCKED' or 'FROZEN'
        const clientId = req.user.client_id;
        const result = await clientRepo.updateCycleStatus(clientId, status);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllBranches = async (req, res) => {
    try {
        const { client_id } = req.user;
        const branches = await clientRepo.getBranchesByClient(client_id);
        res.status(200).json({ success: true, data: branches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
// --- SHIFT MANAGEMENT ---

/**
 * Define a new shift (e.g., Night Shift, 9-to-5)
 * Includes Grace Period and Weekly Offs
 */
exports.createShift = async (req, res) => {
    try {
        const { name, start_time, end_time, grace_period_mins, weekly_offs, late_coming_rules } = req.body;
        const clientId = req.user.client_id;

        const newShift = await shiftRepo.createShift({
            client_id: clientId,
            name,
            start_time,
            end_time,
            grace_period_mins,
            weekly_offs, // Expected as Array: ["Saturday", "Sunday"]
            late_coming_rules // JSON logic for penalties
        });

        res.status(201).json({ success: true, data: newShift });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update shift timings or rules (like changing grace period)
 */
exports.updateShift = async (req, res) => {
    try {
        const { shiftId } = req.params;
        const clientId = req.user.client_id;

        const updatedShift = await shiftRepo.updateShift(shiftId, clientId, req.body);
        
        if (!updatedShift) {
            return res.status(404).json({ success: false, message: "Shift not found or unauthorized" });
        }

        res.status(200).json({ success: true, data: updatedShift });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getShifts = async (req, res) => {
    try {
        const shifts = await shiftRepo.getShiftsByClient(req.user.client_id);
        res.status(200).json({ success: true, data: shifts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// --- ROSTER MANAGEMENT ---

/**
 * Assign employees to shifts and locations for specific dates.
 * Supports bulk scheduling (e.g., scheduling a whole team for the next week).
 */
exports.setRoster = async (req, res) => {
    try {
        const { rosters } = req.body; // Expects Array of [{employee_id, shift_id, roster_date, location_id, is_wfh}]
        const clientId = req.user.client_id;

        if (!Array.isArray(rosters) || rosters.length === 0) {
            return res.status(400).json({ success: false, message: "Roster data must be a non-empty array" });
        }

        const assignedRosters = await rosterRepo.setBulkRoster(clientId, rosters);

        res.status(200).json({ 
            success: true, 
            message: `Successfully scheduled ${assignedRosters.length} roster entries`,
            data: assignedRosters 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Remove an employee from a roster date (e.g., if they are being moved to a different site)
 */
exports.deleteRosterEntry = async (req, res) => {
    try {
        const { employeeId, date } = req.query;
        await rosterRepo.deleteRoster(employeeId, date);
        res.status(200).json({ success: true, message: "Roster entry removed" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};