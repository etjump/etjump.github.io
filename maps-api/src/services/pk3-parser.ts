import JSZip from "jszip";

// Max decompressed BSP size (256 MB) to prevent zip bombs
const MAX_BSP_DECOMPRESSED_SIZE = 256 * 1024 * 1024;

export interface Pk3Contents {
  bspFiles: Array<{
    name: string;
    path: string;
    data: ArrayBuffer;
  }>;
}

export async function parsePk3(pk3Buffer: ArrayBuffer): Promise<Pk3Contents> {
  const zip = await JSZip.loadAsync(pk3Buffer);
  const bspFiles: Pk3Contents["bspFiles"] = [];

  // Find BSP files
  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir) continue;

    if (path.toLowerCase().endsWith(".bsp")) {
      // Check decompressed size before extracting (JSZip exposes it via _data)
      const uncompressedSize = (file as any)._data?.uncompressedSize;
      if (uncompressedSize && uncompressedSize > MAX_BSP_DECOMPRESSED_SIZE) {
        throw new Error(
          `BSP file "${path}" exceeds max decompressed size (${Math.round(uncompressedSize / 1024 / 1024)} MB)`
        );
      }

      const data = await file.async("arraybuffer");

      // Also check actual size after decompression in case metadata was missing
      if (data.byteLength > MAX_BSP_DECOMPRESSED_SIZE) {
        throw new Error(
          `BSP file "${path}" exceeds max decompressed size (${Math.round(data.byteLength / 1024 / 1024)} MB)`
        );
      }

      // Extract just the filename from the path
      const name = path.split("/").pop() || path;
      bspFiles.push({ name, path, data });
    }
  }

  return { bspFiles };
}
