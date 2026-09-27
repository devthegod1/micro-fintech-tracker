const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");

// Points to server/portfolio.db
const DB_PATH = path.resolve(__dirname, "portfolio.db");

let dbInstance = null;

/**
 * Initializes and returns the SQLite database connection singleton.
 */
async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  return dbInstance;
}

/**
 * Sets up tables and seeds default starting cash if the database is empty.
 */
async function initDb() {
  const db = await getDb();

  // 1. Portfolio summary table: stores account-level metrics like cash balance
  await db.exec(`
    CREATE TABLE IF NOT EXISTS portfolio_summary (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      cash_balance REAL NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Trades table: tracks individual buy/sell market order executions
  await db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      type TEXT CHECK(type IN ('BUY', 'SELL')) NOT NULL,
      shares REAL NOT NULL,
      price REAL NOT NULL,
      total_cost REAL NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Seed starting cash ($100,000 USD) if this is the first run
  const existingSummary = await db.get(
    "SELECT * FROM portfolio_summary WHERE id = 1",
  );

  if (!existingSummary) {
    await db.run(
      "INSERT INTO portfolio_summary (id, cash_balance) VALUES (1, ?)",
      [100000.0],
    );
    console.log("🌱 Database initialized with $100,000.00 starting cash.");
  }
}

module.exports = {
  getDb,
  initDb,
};
