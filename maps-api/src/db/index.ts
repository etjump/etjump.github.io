import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH || "./data/etjump-maps.db";

// Ensure the data directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);

// Enable foreign keys
sqlite.exec("PRAGMA foreign_keys = ON;");
// Use WAL mode for better concurrent read/write performance
sqlite.exec("PRAGMA journal_mode = WAL;");
// Wait up to 5 seconds if database is locked by another writer
sqlite.exec("PRAGMA busy_timeout = 5000;");

export const db = drizzle(sqlite, { schema });
export { sqlite };
