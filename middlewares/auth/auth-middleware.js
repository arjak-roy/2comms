// middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    // 1. Check Cookie (Priority for Web)
    // 2. Check Authorization Header (Fallback for Mobile)
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains id, clientId, role
        console.log(req.user);
        next();
    } catch (ex) {
        res.status(400).json({ message: "Invalid token." });
    }
};

module.exports = auth;