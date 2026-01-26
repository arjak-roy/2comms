const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../../repositories/userRepository');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Fetch user from our seeded database
        const user = await userRepository.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // 2. Compare the seeded 'hashed_password' with the incoming plain text
        const isMatch = await bcrypt.compare(password, user.hashed_password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const payload = { id: user.id, client_id: user.client_id, role: user.role, branch_id: user.branch_id };
        // 3. Generate the Token
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Set as Cookie for Web Browsers
    res.cookie('token', token, {
        httpOnly: true,     // Prevents JS access (Crucial!)
        secure: process.env.NODE_ENV === 'production', // Only over HTTPS
        sameSite: 'None',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

    // Send in body for Flutter/Mobile
    res.json({
        success: true,
        token, 
        user: { name: user.name, role: user.role }
    });    
    }
     catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error during login" });
    }
};