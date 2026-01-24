exports.getMe = async (req, res) => {
  try {
    // req.user was populated by your verifyToken middleware
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Send back safe user details (No passwords!)
    res.status(200).json({
      isAuthenticated: true,
      user: req.user
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

