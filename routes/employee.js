const express = require('express');
const router = express.Router();
const empController = require('../controllers/employeeControlleer/employee-contoller'); // Adjust path accordingly
const auth = require('../middlewares/auth/auth-middleware');
const authorize = require('../middlewares/auth/role-auth');

/**
 * EMPLOYEE SELF-SERVICE ROUTES
 * Access: Employee, HR, Admin (Multi-level access for testing/support)
 */
const employeeAccess = authorize(['Employee']);

// 1. Mark Attendance (Requires Geofencing & Selfie from Mobile)
router.post('/punch', auth, employeeAccess, empController.punchAttendance);

// 2. Attendance & Roster Tracking
// Used to show the user their shift timings (9-6) and branch location
router.get('/today-roster', auth, employeeAccess, empController.getTodayRoster);

// 3. Personal History
// Used for the Calendar view in the Flutter app
router.get('/my-history', auth, employeeAccess, empController.getMyAttendance);

// 4. Approval Requests
// Raise requests for Leaves, Missing Punches (Swipe), or WFH
router.post('/request', auth, employeeAccess, empController.raiseRequest);

module.exports = router;