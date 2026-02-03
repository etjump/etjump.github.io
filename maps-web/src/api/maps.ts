const API_BASE = "/api/maps";

export interface MapData {
  id: number;
  filename: string;
  filePath: string;
  fileSize: number;
  checksum: string;
  bspName: string | null;
  mapName: string | null;
  features: string[];
  levelshotPath: string | null;
  displayName: string | null;
  author: string | null;
  releaseYear: number | null;
  difficulty: string | null;
  mapTypes: string[];
  tags: string[];
  downloadCount: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MapsResponse {
  success: boolean;
  data: MapData[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MapResponse {
  success: boolean;
  data: MapData;
}

export interface UploadResponse {
  success: boolean;
  data: MapData;
  parsed: {
    bspName: string;
    mapName: string | null;
    features: string[];
  };
}

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T & { success: boolean; error?: string }> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error("Network error: could not reach the server");
  }

  if (!res.ok) {
    // Try to parse error JSON from server
    try {
      const errorBody = await res.json();
      if (errorBody.error) {
        throw new Error(errorBody.error);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== "Network error: could not reach the server") {
        throw e;
      }
    }
    throw new Error(`Server error (${res.status})`);
  }

  try {
    return await res.json();
  } catch {
    throw new Error("Invalid response from server");
  }
}

export async function getMaps(params?: {
  page?: number;
  limit?: number;
  search?: string;
  difficulty?: string;
  types?: string[];
  year?: number;
}): Promise<MapsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", params.page.toString());
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.search) searchParams.set("search", params.search);
  if (params?.difficulty) searchParams.set("difficulty", params.difficulty);
  if (params?.types && params.types.length > 0) {
    searchParams.set("types", params.types.join(","));
  }
  if (params?.year) searchParams.set("year", params.year.toString());

  const url = `${API_BASE}?${searchParams.toString()}`;
  return safeFetch<MapsResponse>(url);
}

export async function validateKey(uploadKey: string): Promise<{ success: boolean }> {
  return safeFetch(`${API_BASE}/validate-key`, {
    method: "POST",
    headers: {
      "X-Upload-Key": uploadKey,
    },
  });
}

export async function getMap(id: number): Promise<MapResponse> {
  return safeFetch<MapResponse>(`${API_BASE}/${id}`);
}

export async function uploadMap(
  file: File,
  uploadKey: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return safeFetch<UploadResponse>(API_BASE, {
    method: "POST",
    headers: {
      "X-Upload-Key": uploadKey,
    },
    body: formData,
  });
}

export async function updateMap(
  id: number,
  data: {
    displayName?: string;
    author?: string;
    releaseYear?: number;
    difficulty?: string;
    mapTypes?: string[];
    features?: string[];
    tags?: string[];
  },
  uploadKey: string
): Promise<MapResponse> {
  return safeFetch<MapResponse>(`${API_BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Upload-Key": uploadKey,
    },
    body: JSON.stringify(data),
  });
}

export async function uploadImage(
  id: number,
  image: File,
  uploadKey: string
): Promise<MapResponse> {
  const formData = new FormData();
  formData.append("image", image);

  return safeFetch<MapResponse>(`${API_BASE}/${id}/image`, {
    method: "POST",
    headers: {
      "X-Upload-Key": uploadKey,
    },
    body: formData,
  });
}

export async function deleteImage(
  id: number,
  uploadKey: string
): Promise<MapResponse> {
  return safeFetch<MapResponse>(`${API_BASE}/${id}/image`, {
    method: "DELETE",
    headers: {
      "X-Upload-Key": uploadKey,
    },
  });
}

export async function deleteMap(
  id: number,
  uploadKey: string
): Promise<{ success: boolean; message?: string }> {
  return safeFetch(`${API_BASE}/${id}`, {
    method: "DELETE",
    headers: {
      "X-Upload-Key": uploadKey,
    },
  });
}

export function getDownloadUrl(id: number): string {
  return `${API_BASE}/${id}/download`;
}

export function getLevelshotUrl(id: number, cacheBuster?: string): string {
  const base = `${API_BASE}/${id}/levelshot`;
  return cacheBuster ? `${base}?v=${cacheBuster}` : base;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
