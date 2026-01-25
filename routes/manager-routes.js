const express = require('express');
const router = express.Router();
const managerCtrl = require('../controllers/ManagerController/manager-controller');
const auth = require('../middlewares/auth/auth-middleware');
const authorize = require('../middlewares/auth/role-auth');

// Managers and Admins can access these
const managerAccess = authorize(['Admin', 'HR', 'Manager']);

router.post('/team-presence', auth, managerAccess, managerCtrl.getTeamPresence);
router.post('/request/action', auth, managerAccess, managerCtrl.actionTeamRequest);

module.exports = router;