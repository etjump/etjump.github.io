import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const STORAGE_PATH = process.env.STORAGE_PATH || "../storage/maps";
const LEVELSHOTS_PATH = join(STORAGE_PATH, "levelshots");

export async function ensureStorageDir(): Promise<void> {
  if (!existsSync(STORAGE_PATH)) {
    await mkdir(STORAGE_PATH, { recursive: true });
  }
  if (!existsSync(LEVELSHOTS_PATH)) {
    await mkdir(LEVELSHOTS_PATH, { recursive: true });
  }
}

export function computeChecksum(buffer: ArrayBuffer): string {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

// Sanitize name for filesystem: keep only alphanumeric, dash, underscore
function sanitizeForFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.pk3$/i, "") // Remove .pk3 extension if present
    .replace(/\.bsp$/i, "") // Remove .bsp extension if present
    .replace(/[^a-z0-9_-]/g, "_") // Replace invalid chars with underscore
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, "") // Trim leading/trailing underscores
    .slice(0, 50); // Limit length
}

export async function saveMapFile(
  buffer: ArrayBuffer,
  checksum: string,
  originalFilename: string,
  mapName?: string
): Promise<string> {
  await ensureStorageDir();

  // Use mapname_checksum.pk3 format for easier recognition
  const safeName = sanitizeForFilename(mapName || originalFilename);
  const shortChecksum = checksum.slice(0, 12); // First 12 chars is enough for uniqueness
  const filename = `${safeName}_${shortChecksum}.pk3`;
  const filePath = join(STORAGE_PATH, filename);

  await writeFile(filePath, Buffer.from(buffer));

  return filePath;
}

export async function saveLevelshot(
  buffer: ArrayBuffer | Buffer,
  checksum: string,
  mapName?: string
): Promise<string> {
  await ensureStorageDir();

  // Use mapname_checksum.jpg format for easier recognition
  const safeName = mapName ? sanitizeForFilename(mapName) : "levelshot";
  const shortChecksum = checksum.slice(0, 12);
  const filename = `${safeName}_${shortChecksum}.jpg`;
  const filePath = join(LEVELSHOTS_PATH, filename);

  await writeFile(filePath, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));

  return filePath;
}

export async function getMapFile(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

export async function getLevelshot(filePath: string): Promise<Buffer | null> {
  if (!existsSync(filePath)) {
    return null;
  }
  return readFile(filePath);
}

export async function deleteMapFile(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

export async function deleteLevelshot(filePath: string): Promise<void> {
  if (existsSync(filePath)) {
    await unlink(filePath);
  }
}

