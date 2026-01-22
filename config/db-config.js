const { Pool } = require('pg');

// Use environment variables for flexibility between dev, docker, and prod
const db_client = new Pool({
    connectionString: 'postgresql://postgres.hxkjykntbbcwasiqwtyi:Nandini@1122021@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
    ssl: {
        rejectUnauthorized: false // Required for Supabase/AWS connections
    },
    connectionTimeoutMillis: 5000, // Wait 5s for handshake
    idleTimeoutMillis: 30000
});

// Centralized query method for easier logging
module.exports = {
    query: (text, params) => db_client.query(text, params),
    db_client 
};