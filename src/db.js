const { Pool } = require('pg');

const connectionName = process.env.INSTANCE_CONNECTION_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

const pool = new Pool({
  user: dbUser,
  password: dbPassword,
  database: dbName,
  host: `/cloudsql/${connectionName}`,   // UNIX socket path
  ssl: false                              // DO NOT use port
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
  process.exit(1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
