const mysql = require("mysql2/promise");

// The old HOST/USER/PASSWORD/DB names still work, but prefer the DB_* names:
// on Linux and macOS USER is already set to your login name, and dotenv won't override it.
const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.HOST,
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || process.env.PASSWORD,
  database: process.env.DB_NAME || process.env.DB,
  port: Number(process.env.DB_PORT) || 10444,
  waitForConnections: true,
  connectionLimit: 10,
});

// Runs `work` inside a transaction on its own connection. Commits if it
// resolves; rolls back and rethrows if it throws.
async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

const isDuplicateEntry = (err) => err && err.code === "ER_DUP_ENTRY";

module.exports = { pool, withTransaction, isDuplicateEntry };
