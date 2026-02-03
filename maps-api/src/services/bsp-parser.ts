/**
 * Custom BSP parser for Quake 3 / Enemy Territory maps.
 * Only extracts the entities lump to get map metadata.
 *
 * BSP Format Reference: http://www.mralligator.com/q3/
 */

interface BspEntity {
  classname: string;
  [key: string]: string;
}

// ETJump special features that can be detected from entities
export type MapFeature = "portalgun" | "pushers" | "save_zones" | "timerun";

export interface BspMetadata {
  mapName: string | null;
  features: MapFeature[];
}

// BSP header constants
const BSP_MAGIC = "IBSP";
const LUMP_ENTITIES = 0;

// Feature detection rules
// - "all": ALL listed entities must be present
// - "any": ANY of the listed entities must be present
interface FeatureRule {
  mode: "all" | "any";
  entities: string[];
}

const FEATURE_RULES: Record<MapFeature, FeatureRule> = {
  // Timerun requires BOTH start and stop timers
  timerun: {
    mode: "all",
    entities: ["target_starttimer", "target_stoptimer"],
  },
  // Portalgun just needs the weapon
  portalgun: {
    mode: "any",
    entities: ["weapon_portalgun"],
  },
  // Save zones feature = has restricted save areas (nosave zones)
  save_zones: {
    mode: "any",
    entities: ["target_nosave", "trigger_nosave"],
  },
  // Pushers = jump pads
  pushers: {
    mode: "any",
    entities: ["target_push", "trigger_push"],
  },
};

// Minimum BSP size: 4 (magic) + 4 (version) + 17*8 (lump directory) = 144 bytes
const BSP_HEADER_SIZE = 8 + 17 * 8;

export function parseBsp(bspBuffer: ArrayBuffer): BspMetadata {
  if (bspBuffer.byteLength < BSP_HEADER_SIZE) {
    throw new Error(`Invalid BSP file: too small (${bspBuffer.byteLength} bytes)`);
  }

  const view = new DataView(bspBuffer);

  // Verify magic number "IBSP"
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );

  if (magic !== BSP_MAGIC) {
    throw new Error(`Invalid BSP file: expected magic "${BSP_MAGIC}", got "${magic}"`);
  }

  // Version is at offset 4 (should be 0x2e for Q3/ET)
  const version = view.getInt32(4, true);
  if (version !== 0x2e && version !== 0x2f) {
    console.warn(`Unexpected BSP version: 0x${version.toString(16)}`);
  }

  // Lump directory starts at offset 8
  // Each lump entry is 8 bytes: 4 bytes offset + 4 bytes length
  // Entities lump is first (index 0)
  const entitiesOffset = view.getInt32(8 + LUMP_ENTITIES * 8, true);
  const entitiesLength = view.getInt32(8 + LUMP_ENTITIES * 8 + 4, true);

  // Bounds check: ensure offset and length are within the buffer
  if (
    entitiesOffset < 0 ||
    entitiesLength < 0 ||
    entitiesOffset + entitiesLength > bspBuffer.byteLength
  ) {
    throw new Error(
      `Invalid BSP file: entities lump out of bounds (offset=${entitiesOffset}, length=${entitiesLength}, fileSize=${bspBuffer.byteLength})`
    );
  }

  // Extract entities string
  const decoder = new TextDecoder("utf-8");
  const entitiesData = new Uint8Array(bspBuffer, entitiesOffset, entitiesLength);
  const entitiesString = decoder.decode(entitiesData).replace(/\0+$/, ""); // Remove null terminators

  // Parse entities
  const entities = parseEntities(entitiesString);

  // Extract metadata
  const worldspawn = entities.find((e) => e.classname === "worldspawn");
  const mapName = worldspawn?.message || null;

  // Detect ETJump features
  const features = detectFeatures(entities);

  return {
    mapName,
    features,
  };
}

function parseEntities(entitiesString: string): BspEntity[] {
  const entities: BspEntity[] = [];
  let current: Record<string, string> | null = null;

  const lines = entitiesString.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "{") {
      current = {};
    } else if (trimmed === "}") {
      if (current && current.classname) {
        entities.push(current as BspEntity);
      }
      current = null;
    } else if (current && trimmed.startsWith('"')) {
      // Parse key-value pair: "key" "value"
      const match = trimmed.match(/"([^"]+)"\s+"([^"]*)"/);
      if (match) {
        current[match[1]] = match[2];
      }
    }
  }

  return entities;
}

function detectFeatures(entities: BspEntity[]): MapFeature[] {
  const detectedFeatures: MapFeature[] = [];
  const entityClassnames = new Set(entities.map((e) => e.classname.toLowerCase()));

  for (const [feature, rule] of Object.entries(FEATURE_RULES)) {
    let hasFeature: boolean;

    if (rule.mode === "all") {
      // ALL entities must be present
      hasFeature = rule.entities.every((cn) =>
        entityClassnames.has(cn.toLowerCase())
      );
    } else {
      // ANY entity must be present
      hasFeature = rule.entities.some((cn) =>
        entityClassnames.has(cn.toLowerCase())
      );
    }

    if (hasFeature) {
      detectedFeatures.push(feature as MapFeature);
    }
  }

  // Sort alphabetically for consistency
  return detectedFeatures.sort();
}
