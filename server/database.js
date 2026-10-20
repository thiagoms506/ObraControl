import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number.parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "obracontrol",
  waitForConnections: true,
  connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10),
  queueLimit: 0,
});

export async function checkDatabaseConnection() {
  await pool.execute("SELECT 1");
}

export async function closeDatabasePool() {
  await pool.end();
}
