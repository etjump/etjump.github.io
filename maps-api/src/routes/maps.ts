import { Hono } from "hono";
import { eq, asc, sql, and } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../db";
import { maps, type NewMap } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import { parsePk3 } from "../services/pk3-parser";
import { parseBsp } from "../services/bsp-parser";
import {
  computeChecksum,
  saveMapFile,
  saveLevelshot,
  getMapFile,
  getLevelshot,
  deleteMapFile,
  deleteLevelshot,
} from "../services/storage";

const app = new Hono();

// Available features for frontend (core auto-detected features) - alphabetical
const AVAILABLE_FEATURES = ["portalgun", "pushers", "save_zones", "timerun"];

// Available difficulties
const AVAILABLE_DIFFICULTIES = ["Beginner", "Easy", "Medium", "Hard", "Insane"];

// Available map types - alphabetical
const AVAILABLE_MAP_TYPES = ["customs", "gamma", "originals"];

// Validation helpers
const MIN_YEAR = 2000;
const MAX_YEAR = new Date().getFullYear();
const MAX_NAME_LENGTH = 30;
const MAX_AUTHOR_LENGTH = 50; // Authors can have longer names (multiple authors)

// Allowed characters: alphanumeric, spaces, common punctuation
const SAFE_NAME_REGEX = /^[a-zA-Z0-9\s\-_.,!?'"()]+$/;

function sanitizeString(str: string | undefined, maxLength: number): string | undefined {
  if (!str) return undefined;
  const trimmed = str.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
  return trimmed;
}

function validateString(str: string | undefined, fieldName: string, maxLength: number): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less`;
  }
  if (!SAFE_NAME_REGEX.test(trimmed)) {
    return `${fieldName} contains invalid characters`;
  }
  return null;
}

function validateYear(year: number | undefined): string | null {
  if (year === undefined || year === null) return null;
  if (!Number.isInteger(year)) return "Year must be a whole number";
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`;
  }
  return null;
}

// Fixed image dimensions for levelshots (16:9 aspect ratio for consistency)
const IMAGE_WIDTH = 640;
const IMAGE_HEIGHT = 360;

// File size limits (configurable via env, defaults: PK3 = 500 MB, image = 10 MB)
const MAX_PK3_SIZE = parseInt(process.env.MAX_PK3_SIZE_MB || "500") * 1024 * 1024;
const MAX_IMAGE_SIZE = parseInt(process.env.MAX_IMAGE_SIZE_MB || "10") * 1024 * 1024;

// Escape SQL LIKE wildcards in user input
function escapeLike(str: string): string {
  return str.replace(/[%_]/g, "\\$&");
}

// GET /api/maps - List all maps with pagination
app.get("/", async (c) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = Math.min(parseInt(c.req.query("limit") || "10"), 100);
  const search = c.req.query("search");
  const difficulty = c.req.query("difficulty");
  const types = c.req.query("types"); // comma-separated: "gamma,customs"
  const year = c.req.query("year");
  const offset = (page - 1) * limit;

  try {
    const conditions: any[] = [];

    if (search) {
      const escaped = escapeLike(search);
      conditions.push(
        sql`(${maps.displayName} LIKE ${"%" + escaped + "%"} ESCAPE '\\' OR ${maps.mapName} LIKE ${"%" + escaped + "%"} ESCAPE '\\' OR ${maps.author} LIKE ${"%" + escaped + "%"} ESCAPE '\\')`
      );
    }

    if (difficulty) {
      conditions.push(eq(maps.difficulty, difficulty));
    }

    // Filter by types (mapTypes is a JSON array, check if any of the requested types are in it)
    if (types) {
      const typeList = types.split(",").filter(Boolean);
      if (typeList.length > 0) {
        // Build OR conditions for each type
        const typeConditions = typeList.map(
          (type) => sql`${maps.mapTypes} LIKE ${"%" + escapeLike(type) + "%"} ESCAPE '\\'`
        );
        conditions.push(sql`(${sql.join(typeConditions, sql` OR `)})`);
      }
    }

    // Filter by release year
    if (year) {
      conditions.push(eq(maps.releaseYear, parseInt(year)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select()
      .from(maps)
      .where(whereClause)
      .orderBy(asc(sql`LOWER(COALESCE(${maps.displayName}, ${maps.mapName}, ${maps.filename}))`))
      .limit(limit)
      .offset(offset);

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(maps)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);

    return c.json({
      success: true,
      data: results,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing maps:", error);
    return c.json({ success: false, error: "Failed to list maps" }, 500);
  }
});

// GET /api/maps/options - Get available options for dropdowns
app.get("/options", (c) => {
  return c.json({
    success: true,
    data: {
      features: AVAILABLE_FEATURES,
      difficulties: AVAILABLE_DIFFICULTIES,
      mapTypes: AVAILABLE_MAP_TYPES,
    },
  });
});

// POST /api/maps/validate-key - Validate upload key
app.post("/validate-key", requireAuth, (c) => {
  // If we get here, the key is valid (requireAuth passed)
  return c.json({ success: true });
});

// GET /api/maps/:id - Get map details
app.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ success: false, error: "Invalid map ID" }, 400);
  }

  try {
    const [map] = await db.select().from(maps).where(eq(maps.id, id)).limit(1);

    if (!map) {
      return c.json({ success: false, error: "Map not found" }, 404);
    }

    return c.json({ success: true, data: map });
  } catch (error) {
    console.error("Error getting map:", error);
    return c.json({ success: false, error: "Failed to get map" }, 500);
  }
});

// GET /api/maps/:id/levelshot - Get map levelshot image
app.get("/:id/levelshot", async (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ success: false, error: "Invalid map ID" }, 400);
  }

  try {
    const [map] = await db.select().from(maps).where(eq(maps.id, id)).limit(1);

    if (!map || !map.levelshotPath) {
      return c.json({ success: false, error: "Levelshot not found" }, 404);
    }

    const imageBuffer = await getLevelshot(map.levelshotPath);

    if (!imageBuffer) {
      return c.json({ success: false, error: "Levelshot file not found" }, 404);
    }

    const ext = map.levelshotPath.split(".").pop()?.toLowerCase();
    let contentType = "image/jpeg";
    if (ext === "png") contentType = "image/png";

    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error getting levelshot:", error);
    return c.json({ success: false, error: "Failed to get levelshot" }, 500);
  }
});

// GET /api/maps/:id/download - Download PK3 file
app.get("/:id/download", async (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ success: false, error: "Invalid map ID" }, 400);
  }

  try {
    const [map] = await db.select().from(maps).where(eq(maps.id, id)).limit(1);

    if (!map) {
      return c.json({ success: false, error: "Map not found" }, 404);
    }

    const fileBuffer = await getMapFile(map.filePath);

    // Increment download count atomically
    await db
      .update(maps)
      .set({ downloadCount: sql`${maps.downloadCount} + 1` })
      .where(eq(maps.id, id));

    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(map.filename)}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading map:", error);
    return c.json({ success: false, error: "Failed to download map" }, 500);
  }
});

// POST /api/maps - Upload new map (protected)
app.post("/", requireAuth, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ success: false, error: "No file provided" }, 400);
    }

    if (!file.name.toLowerCase().endsWith(".pk3")) {
      return c.json({ success: false, error: "File must be a .pk3 file" }, 400);
    }

    if (file.size > MAX_PK3_SIZE) {
      return c.json({ success: false, error: `File exceeds ${process.env.MAX_PK3_SIZE_MB || "500"} MB limit` }, 400);
    }

    const buffer = await file.arrayBuffer();
    const checksum = computeChecksum(buffer);

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(maps)
      .where(eq(maps.checksum, checksum))
      .limit(1);

    if (existing) {
      return c.json(
        {
          success: false,
          error: "This map already exists",
          existingId: existing.id,
        },
        409
      );
    }

    // Parse PK3 to find BSP
    const pk3Contents = await parsePk3(buffer);

    if (pk3Contents.bspFiles.length === 0) {
      return c.json(
        { success: false, error: "No BSP file found in PK3" },
        400
      );
    }

    // Parse BSP to extract metadata
    const bspFile = pk3Contents.bspFiles[0];
    let bspMetadata;
    try {
      bspMetadata = parseBsp(bspFile.data);
    } catch (err) {
      console.error("BSP parsing error:", err);
      bspMetadata = {
        mapName: null,
        features: [],
      };
    }

    // Determine the map name for file naming
    const mapNameForFile = bspMetadata.mapName || bspFile.name.replace(".bsp", "");

    // Save file to storage
    const filePath = await saveMapFile(buffer, checksum, file.name, mapNameForFile);

    // Insert into database
    const newMap: NewMap = {
      filename: file.name,
      filePath,
      fileSize: buffer.byteLength,
      checksum,
      bspName: bspFile.name,
      mapName: bspMetadata.mapName,
      features: bspMetadata.features,
      displayName: mapNameForFile,
      isPublished: false,
    };

    let inserted;
    try {
      [inserted] = await db.insert(maps).values(newMap).returning();
    } catch (insertError: any) {
      // Handle race condition: another request inserted the same checksum
      if (insertError?.message?.includes("UNIQUE constraint")) {
        // Clean up the saved file since we won't use it
        await deleteMapFile(filePath);
        return c.json(
          { success: false, error: "This map already exists" },
          409
        );
      }
      throw insertError;
    }

    return c.json(
      {
        success: true,
        data: inserted,
        parsed: {
          bspName: bspFile.name,
          mapName: bspMetadata.mapName,
          features: bspMetadata.features,
        },
      },
      201
    );
  } catch (error) {
    console.error("Error uploading map:", error);
    return c.json({ success: false, error: "Failed to upload map" }, 500);
  }
});

// POST /api/maps/:id/image - Upload custom image (protected)
app.post("/:id/image", requireAuth, async (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ success: false, error: "Invalid map ID" }, 400);
  }

  try {
    const [existing] = await db
      .select()
      .from(maps)
      .where(eq(maps.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Map not found" }, 404);
    }

    const formData = await c.req.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return c.json({ success: false, error: "No image provided" }, 400);
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return c.json({ success: false, error: `Image exceeds ${process.env.MAX_IMAGE_SIZE_MB || "10"} MB limit` }, 400);
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        { success: false, error: "Image must be JPEG, PNG, or WebP" },
        400
      );
    }

    // Process image - resize and crop to fixed 16:9 dimensions for consistency
    const imageBuffer = await file.arrayBuffer();
    const resizedImage = await sharp(Buffer.from(imageBuffer))
      .resize(IMAGE_WIDTH, IMAGE_HEIGHT, {
        fit: "cover", // Crop to fill entire area, no letterboxing
        position: "center",
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Delete old levelshot if exists
    if (existing.levelshotPath) {
      await deleteLevelshot(existing.levelshotPath);
    }

    // Save new image with map name for easier recognition
    const mapNameForFile = existing.displayName || existing.mapName || existing.bspName || "map";
    const levelshotPath = await saveLevelshot(
      resizedImage,
      existing.checksum,
      mapNameForFile
    );

    // Update database
    const [updated] = await db
      .update(maps)
      .set({
        levelshotPath,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(maps.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error uploading image:", error);
    return c.json({ success: false, error: "Failed to upload image" }, 500);
  }
});

// DELETE /api/maps/:id/image - Delete map image (protected)
app.delete("/:id/image", requireAuth, async (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ success: false, error: "Invalid map ID" }, 400);
  }

  try {
    const [existing] = await db
      .select()
      .from(maps)
      .where(eq(maps.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Map not found" }, 404);
    }

    if (!existing.levelshotPath) {
      return c.json({ success: false, error: "Map has no image" }, 400);
    }

    // Delete the levelshot file
    await deleteLevelshot(existing.levelshotPath);

    // Update database
    const [updated] = await db
      .update(maps)
      .set({
        levelshotPath: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(maps.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error deleting image:", error);
    return c.json({ success: false, error: "Failed to delete image" }, 500);
  }
});

// PUT /api/maps/:id - Update map metadata (protected)
app.put("/:id", requireAuth, async (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ success: false, error: "Invalid map ID" }, 400);
  }

  try {
    const body = await c.req.json();
    const { displayName, author, releaseYear, difficulty, mapTypes, features, tags } = body;

    // Validate inputs
    const errors: string[] = [];

    // Validate displayName (max 30 chars)
    const nameError = validateString(displayName, "Display name", MAX_NAME_LENGTH);
    if (nameError) errors.push(nameError);

    // Validate author (max 50 chars to allow multiple authors)
    const authorError = validateString(author, "Author", MAX_AUTHOR_LENGTH);
    if (authorError) errors.push(authorError);

    // Validate year
    const yearError = validateYear(releaseYear);
    if (yearError) errors.push(yearError);

    // Validate difficulty (must be from allowed list if provided)
    if (difficulty && !AVAILABLE_DIFFICULTIES.includes(difficulty)) {
      errors.push(`Invalid difficulty. Must be one of: ${AVAILABLE_DIFFICULTIES.join(", ")}`);
    }

    // Validate mapTypes (must be from allowed list if provided)
    if (mapTypes && Array.isArray(mapTypes)) {
      const invalidTypes = mapTypes.filter((t: string) => !AVAILABLE_MAP_TYPES.includes(t));
      if (invalidTypes.length > 0) {
        errors.push(`Invalid map types: ${invalidTypes.join(", ")}`);
      }
    }

    // Validate features (custom features allowed, but sanitize them)
    if (features && Array.isArray(features)) {
      for (const feature of features) {
        if (typeof feature !== "string" || feature.length > 50) {
          errors.push("Each feature must be a string of 50 characters or less");
          break;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(feature)) {
          errors.push("Features can only contain letters, numbers, and underscores");
          break;
        }
      }
    }

    if (errors.length > 0) {
      return c.json({ success: false, error: errors.join("; ") }, 400);
    }

    const [existing] = await db
      .select()
      .from(maps)
      .where(eq(maps.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Map not found" }, 404);
    }

    // Sanitize inputs before saving
    const [updated] = await db
      .update(maps)
      .set({
        displayName: sanitizeString(displayName, MAX_NAME_LENGTH),
        author: sanitizeString(author, MAX_AUTHOR_LENGTH),
        releaseYear,
        difficulty,
        mapTypes,
        features,
        tags,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(maps.id, id))
      .returning();

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating map:", error);
    return c.json({ success: false, error: "Failed to update map" }, 500);
  }
});

// POST /api/maps/:id/publish - Toggle publish status (protected)
app.post("/:id/publish", requireAuth, async (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ success: false, error: "Invalid map ID" }, 400);
  }

  try {
    // Atomic toggle: NOT(is_published) in a single UPDATE
    const [updated] = await db
      .update(maps)
      .set({
        isPublished: sql`NOT ${maps.isPublished}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(maps.id, id))
      .returning();

    if (!updated) {
      return c.json({ success: false, error: "Map not found" }, 404);
    }

    return c.json({
      success: true,
      data: updated,
      message: updated.isPublished ? "Map published" : "Map unpublished",
    });
  } catch (error) {
    console.error("Error toggling publish:", error);
    return c.json({ success: false, error: "Failed to toggle publish" }, 500);
  }
});

// DELETE /api/maps/:id - Delete map (protected)
app.delete("/:id", requireAuth, async (c) => {
  const id = parseInt(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ success: false, error: "Invalid map ID" }, 400);
  }

  try {
    const [existing] = await db
      .select()
      .from(maps)
      .where(eq(maps.id, id))
      .limit(1);

    if (!existing) {
      return c.json({ success: false, error: "Map not found" }, 404);
    }

    // Delete file from storage
    await deleteMapFile(existing.filePath);

    // Delete levelshot if exists
    if (existing.levelshotPath) {
      await deleteLevelshot(existing.levelshotPath);
    }

    // Delete from database
    await db.delete(maps).where(eq(maps.id, id));

    return c.json({ success: true, message: "Map deleted" });
  } catch (error) {
    console.error("Error deleting map:", error);
    return c.json({ success: false, error: "Failed to delete map" }, 500);
  }
});

export default app;
