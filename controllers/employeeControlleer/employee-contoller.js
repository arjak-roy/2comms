const attendanceRepo = require('../../repositories/attendenceRepository');
const approvalRepo = require('../../repositories/approvalRepository');

// 1. Mark Attendance (Punch In/Out)
exports.punchAttendance = async (req, res) => {
    try {
        const { lat, lng, type, location_type, selfie_url } = req.body;
        const userId = req.user.id;
        const clientId = req.user.client_id;

        // The repo handles the Geofence check we built earlier
        const result = await attendanceRepo.recordPunch(clientId, userId, {
            lat, lng, type, location_type, selfie_url
        });

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        // If Geofence fails, the repo throws an error which we catch here
        res.status(403).json({ success: false, message: error.message });
    }
};

// 2. Raise Approval Request (Leave, Swipe/Regularization)
exports.raiseRequest = async (req, res) => {
    try {
        const { type, details } = req.body; // type: 'Leave', 'Swipe', etc.
        const userId = req.user.id;
        const clientId = req.user.client_id;

        const request = await approvalRepo.createRequest(clientId, userId, { type, details });
        res.status(201).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. View Personal Attendance History
exports.getMyAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month, year } = req.query;

        const history = await attendanceRepo.getEmployeeHistory(userId, month, year);
        res.status(200).json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 4. Get Current Shift/Roster
exports.getTodayRoster = async (req, res) => {
    try {
        const userId = req.user.id;
        const roster = await attendanceRepo.getTodayRoster(userId);
        res.status(200).json({ success: true, data: roster });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};