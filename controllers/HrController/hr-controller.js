const userRepo = require('../../repositories/userRepository');
const attendanceRepo = require('../../repositories/attendenceRepository');
const approvalRepo = require('../../repositories/approvalRepository');
const calculateInterval = require('../../utils/calculate-intervals');

// 1. Attendance Monitoring & Snapshot
// Managers/HR get daily snapshots of who is logged in, late, or absent 
exports.getDailySnapshot = async (req, res) => {
    try {
        const clientId = req.user.client_id; 
        const date  = req.body.date; // Default to today in the repo
        const snapshot = await attendanceRepo.getDailySnapshot(clientId, date);
        res.status(200).json({ success: true, data: snapshot });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


// 2. Attendance Regularization
// HR can perform regularization to correct missing punches or errors [cite: 43, 44]

exports.regularizeAttendance = async (req, res) => {
    try {
        const { employeeId, date, status, punches, is_late } = req.body;
        const clientId = req.user.clientId;
        const total_hours = calculateInterval.calculateIntervals(punches);
        const result = await attendanceRepo.updateAttendance(clientId, employeeId, {
            date,
            status, // e.g., Present, Half-Day [cite: 33]
            total_hours,
            is_late
        });

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. Absence & Loss of Pay (LOP) Management
// HR can convert missing attendance to LOP or adjust against leave 
exports.manageAbsence = async (req, res) => {
    try {
        const { attendanceId, action, employeeId } = req.body; // action: 'LOP', 'LEAVE_ADJUST'
        const clientId = req.user.client_id;

        const result = await attendanceRepo.processAbsence(attendanceId, employeeId, action);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 4. Cycle Locking & Freezing
// HR finalizes the cycle so managers/employees cannot edit data 
exports.finalizeCycle = async (req, res) => {
    try {
        const { cycleId, status } = req.body; // 'LOCKED' or 'FROZEN'
        const clientId = req.user.client_id;

        const result = await userRepo.updateCycleStatus(clientId, cycleId, status);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 5. Reporting
// HR views leave and attendance data at branch or client levels 
exports.getReports = async (req, res) => {
    try {
        const { type, branchId, view } = req.query; // type: 'LEAVE' or 'ATTENDANCE'; view: 'MONTH' , 'WEEK', 'DAY'
        const clientId = req.user.client_id;

        const report = await attendanceRepo.generateReport(clientId, { type, branchId, view });
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ... existing imports (clientRepo, attendanceRepo, approvalRepo)

// 6. Manage Pending Approvals
// HR views requests pending across their mapped clients [cite: 8, 52]
exports.getPendingApprovals = async (req, res) => {
    try {
        const clientId = req.user.client_id;
        // Filters can include request type (Leave, OT, Swipe, etc.) 
        const { type, status = 'Pending' } = req.query; 

        const requests = await approvalRepo.getRequestsByClient(clientId, { status, type});
        res.status(200).json({ success: true, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 7. Take Action on Request
// HR acts as an approver or overrides based on hierarchy 
exports.actionApprovalRequest = async (req, res) => {
    try {
        const { requestId, action, comments } = req.body; // action: 'Approved' or 'Rejected' 
        const userId = req.user.id; // The HR user performing the action

        const result = await approvalRepo.updateRequestStatus(requestId, userId, {
            status: action,
            comments: comments
        });

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 8. Trigger Reminders
// Manually trigger reminders if approvals are pending beyond 48 hours 
exports.sendApprovalReminders = async (req, res) => {
    try {
        const clientId = req.user.client_id;
        
        // Logic to find requests older than 48h and send notifications [cite: 46, 50]
        const remindersSent = await approvalRepo.notifyPendingApprovers(clientId);
        
        res.status(200).json({ 
            success: true, 
            message: `Reminders triggered for ${remindersSent} pending requests.` 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};