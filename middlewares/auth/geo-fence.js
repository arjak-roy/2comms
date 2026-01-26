const haversineDistance = require('../../utils/havesine');
const db = require('../../config/db-config'); // Scoped data access

const verifyGeofence = async (req, res, next) => {
    try {
        const { lat, lng } = req.body;
        const { branch_id, client_id } = req.user; // From auth-middleware

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "GPS coordinates required." });
        }

        // Fetch branch coordinates and radius from DB
        const query = `SELECT latitude, longitude, radius_meters FROM branches 
                       WHERE id = $1 AND client_id = $2`;
        const { rows } = await db.query(query, [branch_id, client_id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Branch location not found." });
        }

        const branch = rows[0];
        const distanceKm = haversineDistance(
            latitude, longitude, 
            branch.latitude, branch.longitude
        );

        const distanceMeters = distanceKm * 1000;

        if (distanceMeters > branch.radius_meters) {
            return res.status(403).json({ 
                success: false,
                message: "Out of range. Please punch from within the designated office area.",
                distance: `${Math.round(distanceMeters)}m`,
                allowed_radius: `${branch.radius_meters}m`
            });
        }

        next(); // User is inside geofence
    } catch (error) {
        console.error("Geofence Error:", error);
        res.status(500).json({ message: "Error verifying location." });
    }
};

module.exports = verifyGeofence;