import { sqlite } from "./index";

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS maps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    bsp_name TEXT,
    map_name TEXT,
    features TEXT DEFAULT '[]',
    levelshot_path TEXT,
    display_name TEXT,
    author TEXT,
    release_year INTEGER,
    difficulty TEXT,
    map_types TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    download_count INTEGER DEFAULT 0,
    is_published INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_maps_checksum ON maps(checksum);
  CREATE INDEX IF NOT EXISTS idx_maps_is_published ON maps(is_published);
`);

// Add new columns if they don't exist (for existing databases)
const addColumnIfNotExists = (table: string, column: string, type: string) => {
  try {
    sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    console.log(`Added column ${column} to ${table}`);
  } catch (e: any) {
    // Column already exists, ignore
    if (!e.message.includes("duplicate column")) {
      throw e;
    }
  }
};

addColumnIfNotExists("maps", "features", "TEXT DEFAULT '[]'");
addColumnIfNotExists("maps", "levelshot_path", "TEXT");
addColumnIfNotExists("maps", "release_year", "INTEGER");
addColumnIfNotExists("maps", "map_types", "TEXT DEFAULT '[]'");

console.log("Database migrated successfully!");
console.log("Database location:", process.env.DATABASE_PATH || "./data/etjump-maps.db");
