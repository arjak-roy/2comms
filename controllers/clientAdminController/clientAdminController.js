const clientRepo = require('../../repositories/clientRepository');
const userRepo = require('../../repositories/userRepository');
const bcrypt = require('bcryptjs');


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

// //Approval Configuration
// exports.configureApprovalFlow = async (req, res) => {
//     try {
//         const { requestType, levelsRequired } = req.body; // e.g., 'Leave', 2
//         const clientId = req.user.clientId;

//         const config = await clientRepo.updateApprovalConfig(clientId, requestType, levelsRequired);
//         res.status(200).json({ success: true, data: config });
//     } catch (error) {
//         res.status(500).json({ success: false, error: error.message });
//     }
// };