const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth/auth-middleware');
const authorize = require('../middlewares/auth/role-auth');
const superAdminController = require('../controllers/SuperAdmin/sa-controller');

// Only SuperAdmin can create a new Client (Company)
router.post('/clients', auth, authorize(['Super Admin']), superAdminController.registerNewClient);

// Client Admin or HR can add branches to their own company
router.post('/branches', auth, authorize(['Admin', 'HR','Super Admin']), superAdminController.addBranch);

//client admin or hr can add employees to their own company
router.post('/createUsers', auth, authorize(['Super Admin']), superAdminController.createUser);

module.exports = router;