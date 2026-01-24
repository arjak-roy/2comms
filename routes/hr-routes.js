const express = require('express');
const router = express.Router();
const hrController = require('../controllers/HrController/hr-controller'); // Adjust path as per your folder structure
const auth = require('../middlewares/auth/auth-middleware');
const authorize = require('../middlewares/auth/role-auth');

/**
 * SHARED ACCESS: Admin & HR
 * These routes allow both the Company Owner (Admin) and the HR Manager
 * to handle operational attendance and approval tasks.
 */
const hrAndAdmin = authorize(['Admin', 'HR', 'Super Admin']);

// 1. Attendance Monitoring & Snapshot
router.post('/attendance/snapshot', auth, hrAndAdmin, hrController.getDailySnapshot);

// 2. Attendance Regularization (Manual Corrections)
router.post('/attendance/regularize', auth, hrAndAdmin, hrController.regularizeAttendance);

// 3. Absence & Loss of Pay (LOP) Management
router.post('/attendance/manage-absence', auth, hrAndAdmin, hrController.manageAbsence);

// 4. Cycle Locking & Freezing (Finalizing Payroll Prep)
router.post('/cycle/finalize', auth, hrAndAdmin, hrController.finalizeCycle);

// 5. Reporting (Monthly, Weekly, Daily views)
router.post('/reports', auth, hrAndAdmin, hrController.getReports);

// 6. Manage Pending Approvals (List view)
router.get('/approvals/pending', auth, hrAndAdmin, hrController.getPendingApprovals);

// 7. Take Action on Request (Approve/Reject)
router.post('/approvals/action', auth, hrAndAdmin, hrController.actionApprovalRequest);

// 8. Trigger Reminders (Manual SLA push)
router.post('/approvals/reminders', auth, hrAndAdmin, hrController.sendApprovalReminders);

//9. Get Employees by Client
router.get('/employees', auth, hrAndAdmin, hrController.getEmployees);

module.exports = router;