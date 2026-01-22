/**
 * @param {Array} allowedRoles - e.g., ['Admin', 'HR']
 */
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        // req.user is populated by the previous 'auth' middleware
        if (!req.user || !req.user.role) {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized: User information missing" 
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Forbidden: ${req.user.role} role does not have access to this resource.` 
            });
        }

        next();
    };
};

module.exports = authorize;