// This file should only be imported on the server-side.
import Database from "better-sqlite3";
import path from "path";

// Ensure this module isn't accidentally imported on the client.
if (typeof window !== "undefined") {
  throw new Error("Database module should not be imported on the client side.");
}

const dbPath = path.resolve(process.cwd(), "src", "db", "crm.db");

let db: Database.Database;

try {
  db = new Database(dbPath); // Add { verbose: console.log } for debugging if needed
  // It's good practice to enable WAL mode for better concurrency and performance.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON"); // Enforce foreign key constraints
  console.log(`SQLite Connection Opened to: ${dbPath}. Foreign keys ON.`);

  // Graceful shutdown
  // These handlers help ensure the database connection is closed when the Node.js process exits.
  const closeDb = () => {
    if (db && db.open) {
      db.close();
      console.log("SQLite Connection Closed");
    }
  };

  process.on("exit", closeDb); // Standard process exit
  process.on("SIGINT", () => {
    // Catches Ctrl+C
    closeDb();
    process.exit(0); // Exits the process after closing the DB
  });
  process.on("SIGTERM", () => {
    // Catches `kill` signals
    closeDb();
    process.exit(0); // Exits the process after closing the DB
  });
} catch (error) {
  console.error("Failed to open SQLite database:", error);
  // Depending on your application's needs, you might want to throw the error
  // or handle it in a way that allows the app to run in a degraded state.
  throw new Error(`Failed to initialize database connection to ${dbPath}`);
}

// Export the initialized database connection.
export { db };
