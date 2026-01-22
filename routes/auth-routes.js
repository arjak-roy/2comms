var express = require('express');
var router = express.Router();
const loginCOntroller = require('../controllers/Auth/login');
const logoutController = require('../controllers/Auth/logout');
const auth = require('../middlewares/auth/auth-middleware');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user, check tenant, and return JWT/Set Cookie
 * @access  Public
 */
router.post('/api/auth/login', loginCOntroller.login);
router.post('/api/auth/logout', auth, logoutController.logout);
/**
 * @route   POST /api/auth/logout
 * @desc    Clear the HttpOnly cookie
 * @access  Private (Requires Auth)
 */

module.exports = router;