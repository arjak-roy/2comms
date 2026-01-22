exports.logout = (req, res) => {
    // 1. Clear the HttpOnly cookie by setting its expiration to the past
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0), // Set expiration to 1970 (immediate expiry)
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        path: '/' // Ensure it clears the cookie for the entire domain
    });

    res.status(200).json({
        success: true,
        message: "Logged out successfully. Token cleared."
    });
};