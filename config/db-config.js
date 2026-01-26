const { Pool } = require('pg');

// Use environment variables for flexibility between dev, docker, and prod
const db_client = new Pool({
    connectionString: process.env.SUPABASE_POSTGRES_URL,
    ssl: {
        rejectUnauthorized: false // Required for Supabase/AWS connections
    },
    connectionTimeoutMillis: 5000, // Wait 5s for handshake
    idleTimeoutMillis: 30000
});

// Centralized query method for easier logging
module.exports = {
    query: (text, params) => {db_client.query(text, params);},
    db_client 
};
