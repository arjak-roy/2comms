const approvalRepo = require('../../repositories/approvalRepository');
const attendanceRepo = require('../../repositories/attendenceRepository');

// 1. View Team Attendance Snapshot
exports.getTeamPresence = async (req, res) => {
    try {
        const managerId = req.user.id; 
        const { date } = req.query;
        
        // This repo method should filter by u.manager_id = $1
        const snapshot = await attendanceRepo.getDailySnapshotByManager(managerId, date);
        res.status(200).json({ success: true, data: snapshot });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. Approve/Reject Team Requests (Leave/Swipe)
exports.actionTeamRequest = async (req, res) => {
    try {
        const { requestId, action, comments } = req.body;
        const managerId = req.user.id;

        // Ensure the manager can only action requests where they are the designated approver
        const result = await approvalRepo.updateRequestStatus(requestId, managerId, {
            status: action,
            comments
        });

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};