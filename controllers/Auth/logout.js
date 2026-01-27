exports.logout = (req, res) => {
    // 1. Clear the HttpOnly cookie by setting its expiration to the past
      res.clearCookie('token',
    {
      httpOnly: true, // Prevents XSS (JavaScript cannot access this)
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      sameSite: 'None', // Protects against CSRF
    }
   );
    res.status(200).json({
        success: true,
        message: "Logged out successfully. Token cleared."
    });
};