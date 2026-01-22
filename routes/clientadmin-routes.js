const express = require('express');
const router = express.Router();

// Importing the Controller and Middleware
const adminClientController = require('../controllers/clientAdminController/clientAdminController');
const verifyToken = require('../middlewares/auth/auth-middleware');
const authorize = require('../middlewares/auth/role-auth');
// Protect all routes: Must be logged in and have the 'Admin' role
router.use(verifyToken);
router.use(authorize('Admin, Super Admin'));

// --- BRANCH MANAGEMENT ---
// Requirement: Branches are maintained client-wise [cite: 16]
router.post('/branches', adminClientController.createBranch);
router.patch('/branches/:branchId/rules', adminClientController.updateBranchRules);
router.get('/branches', adminClientController.getAllBranches);

// --- EMPLOYEE & USER MANAGEMENT ---
// Requirement: Admin users manage users and features [cite: 9]
router.post('/employees/onboard', adminClientController.onboardEmployee); //tested

// Requirement: Employee mobility requires lapsing balances 
router.post('/employees/transfer', adminClientController.transferEmployee);

// --- CLIENT POLICY & RULE CONFIGURATION ---
// Requirement: Rules for attendance, leave, and OT are controlled at client level 
router.patch('/rules/global', adminClientController.updateClientRules);

// Requirement: Common approval framework for swipe, leave, and OT 
// router.patch('/rules/approvals', adminClientController.configureApprovalFlow);

// --- ATTENDANCE CYCLE MANAGEMENT ---
// Requirement: HR/Admin can lock and freeze attendance cycles 
router.post('/cycle/finalize', adminClientController.finalizeCycle);

module.exports = router;