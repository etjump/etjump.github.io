import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const maps = sqliteTable("maps", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // File info
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  checksum: text("checksum").notNull().unique(),

  // Extracted from BSP
  bspName: text("bsp_name"),
  mapName: text("map_name"),

  // ETJump features detected from BSP (stored as JSON array)
  features: text("features", { mode: "json" }).$type<string[]>().default([]),

  // Levelshot image path (extracted from PK3)
  levelshotPath: text("levelshot_path"),

  // User-provided metadata
  displayName: text("display_name"),
  author: text("author"),
  releaseYear: integer("release_year"),
  difficulty: text("difficulty"),
  mapTypes: text("map_types", { mode: "json" }).$type<string[]>().default([]), // gamma, customs, originals
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),

  // Stats
  downloadCount: integer("download_count").default(0),

  // Status (SQLite uses 0/1 for boolean)
  isPublished: integer("is_published", { mode: "boolean" }).default(false),

  // Timestamps (stored as ISO strings)
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

export type Map = typeof maps.$inferSelect;
export type NewMap = typeof maps.$inferInsert;
