import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MapData,
  formatFileSize,
  getLevelshotUrl,
  getDownloadUrl,
  deleteMap,
  updateMap,
  uploadImage,
  deleteImage,
} from "../api/maps";
import { useAuth } from "../context/AuthContext";

interface MapTableProps {
  maps: MapData[];
  loading: boolean;
  onMapDeleted?: () => void;
  onMapUpdated?: () => void;
}

const DIFFICULTIES = ["Beginner", "Easy", "Medium", "Hard", "Insane"];
const FEATURES = ["portalgun", "pushers", "save_zones", "timerun"]; // Alphabetical
const MAP_TYPES = ["customs", "gamma", "originals"]; // Alphabetical

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-green-900 text-green-300",
  Easy: "bg-green-800 text-green-200",
  Medium: "bg-yellow-900 text-yellow-300",
  Hard: "bg-red-900/80 text-red-300",
  Insane: "bg-purple-900 text-purple-300",
};

export default function MapTable({
  maps,
  loading,
  onMapDeleted,
  onMapUpdated,
}: MapTableProps) {
  const { secretKey, isAuthenticated } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAuthors, setEditAuthors] = useState<string[]>([]);
  const [editAuthorInput, setEditAuthorInput] = useState("");
  const [editYear, setEditYear] = useState<number | "">("");
  const [editDifficulty, setEditDifficulty] = useState("");
  const [editMapTypes, setEditMapTypes] = useState<string[]>([]);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editCustomFeature, setEditCustomFeature] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  // Image edit state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className="bg-neutral-800 rounded-lg border border-neutral-700">
        <div className="animate-pulse p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-neutral-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (maps.length === 0) {
    return (
      <div className="bg-neutral-800 rounded-lg border border-neutral-700 p-8 text-center">
        <p className="text-neutral-400">No maps found</p>
      </div>
    );
  }

  const toggleExpand = (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setEditingId(null);
      resetImageState();
    }
    setError(null);
    setDeletingId(null);
  };

  const parseAuthors = (authorStr: string | null): string[] => {
    if (!authorStr) return [];
    return authorStr.split(",").map((a) => a.trim()).filter(Boolean);
  };

  const resetImageState = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const startEdit = (map: MapData) => {
    setEditingId(map.id);
    setEditName(map.displayName || "");
    setEditAuthors(parseAuthors(map.author));
    setEditAuthorInput("");
    setEditYear(map.releaseYear || "");
    setEditDifficulty(map.difficulty || "");
    setEditMapTypes(map.mapTypes || []);
    setEditFeatures(map.features || []);
    setEditCustomFeature("");
    resetImageState();
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetImageState();
    setError(null);
  };

  const toggleFeature = (feature: string) => {
    setEditFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const toggleMapType = (type: string) => {
    setEditMapTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const addAuthor = () => {
    const trimmed = editAuthorInput.trim();
    if (trimmed && !editAuthors.includes(trimmed)) {
      setEditAuthors([...editAuthors, trimmed]);
      setEditAuthorInput("");
    }
  };

  const removeAuthor = (author: string) => {
    setEditAuthors(editAuthors.filter((a) => a !== author));
  };

  const addCustomFeature = () => {
    const trimmed = editCustomFeature.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed && !editFeatures.includes(trimmed)) {
      setEditFeatures([...editFeatures, trimmed]);
      setEditCustomFeature("");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Image must be JPEG, PNG, or WebP");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleImageUpload = async (mapId: number) => {
    if (!imageFile) return;

    setUploadingImage(true);
    setError(null);

    try {
      const response = await uploadImage(mapId, imageFile, secretKey);
      if (response.success) {
        resetImageState();
        onMapUpdated?.();
      } else {
        setError((response as any).error || "Failed to upload image");
      }
    } catch (err) {
      setError("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async (mapId: number) => {
    if (!confirm("Delete this image?")) return;

    setDeletingImage(true);
    setError(null);

    try {
      const response = await deleteImage(mapId, secretKey);
      if (response.success) {
        onMapUpdated?.();
      } else {
        setError((response as any).error || "Failed to delete image");
      }
    } catch (err) {
      setError("Failed to delete image");
    } finally {
      setDeletingImage(false);
    }
  };

  const handleSave = async (mapId: number) => {
    if (!isAuthenticated) {
      setError("Please set the secret key above first");
      return;
    }

    setSavingId(mapId);
    setError(null);

    try {
      const response = await updateMap(
        mapId,
        {
          displayName: editName,
          author: editAuthors.join(", "),
          releaseYear: editYear ? Number(editYear) : undefined,
          difficulty: editDifficulty || undefined,
          mapTypes: editMapTypes,
          features: editFeatures,
        },
        secretKey
      );

      if (response.success) {
        setEditingId(null);
        resetImageState();
        onMapUpdated?.();
      } else {
        setError((response as any).error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save changes");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (mapId: number) => {
    if (!isAuthenticated) {
      setError("Please set the secret key above first");
      return;
    }

    if (!confirm("Are you sure you want to delete this map?")) {
      return;
    }

    setDeletingId(mapId);
    setError(null);

    try {
      const response = await deleteMap(mapId, secretKey);
      if (response.success) {
        setExpandedId(null);
        onMapDeleted?.();
      } else {
        setError(response.message || "Failed to delete");
      }
    } catch (err) {
      setError("Failed to delete map");
    } finally {
      setDeletingId(null);
    }
  };

  const formatAuthors = (authorStr: string | null) => {
    if (!authorStr) return "-";
    const authors = parseAuthors(authorStr);
    if (authors.length <= 2) {
      return authors.join(", ");
    }
    return `${authors[0]} +${authors.length - 1}`;
  };

  const formatMapTypes = (types: string[] | undefined) => {
    if (!types || types.length === 0) return null;
    return types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(", ");
  };

  return (
    <div className="bg-neutral-800 rounded-lg border border-neutral-700 overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[24px_1fr_1fr_80px_1fr_1fr_100px] gap-2 px-4 py-3 bg-neutral-700/50 text-sm font-medium text-neutral-400 border-b border-neutral-700">
        <div></div>
        <div className="text-center">Name</div>
        <div className="text-center">Author</div>
        <div className="text-center">Year</div>
        <div className="text-center">Type</div>
        <div className="text-center">Difficulty</div>
        <div className="text-center">Action</div>
      </div>

      {/* Table Rows */}
      {maps.map((map) => (
        <div key={map.id} className="border-b border-neutral-700 last:border-b-0">
          {/* Main Row */}
          <div
            className="grid grid-cols-[24px_1fr_1fr_80px_1fr_1fr_100px] gap-2 px-4 py-3 hover:bg-neutral-700/30 cursor-pointer items-center"
            onClick={() => toggleExpand(map.id)}
          >
            {/* Expand Arrow - Fixed width column */}
            <div className="flex justify-center">
              <svg
                className={`w-4 h-4 text-neutral-500 transition-transform ${
                  expandedId === map.id ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
            {/* Name */}
            <div className="text-center">
              <span className="text-etjump truncate">
                {map.displayName || map.mapName || map.bspName || map.filename}
              </span>
            </div>
            {/* Author */}
            <div className="text-neutral-400 text-center truncate" title={map.author || ""}>
              {formatAuthors(map.author)}
            </div>
            {/* Year */}
            <div className="text-neutral-400 text-center">
              {map.releaseYear || "-"}
            </div>
            {/* Type */}
            <div className="text-center">
              {map.mapTypes && map.mapTypes.length > 0 ? (
                <span className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
                  {formatMapTypes(map.mapTypes)}
                </span>
              ) : (
                <span className="text-neutral-500">-</span>
              )}
            </div>
            {/* Difficulty */}
            <div className="text-center">
              {map.difficulty ? (
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    DIFFICULTY_COLORS[map.difficulty] ||
                    "bg-neutral-700 text-neutral-300"
                  }`}
                >
                  {map.difficulty}
                </span>
              ) : (
                <span className="text-neutral-500">-</span>
              )}
            </div>
            {/* Action */}
            <div className="flex justify-center">
              <a
                href={getDownloadUrl(map.id)}
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-etjump text-neutral-900 px-3 py-1 rounded hover:bg-etjump-600 hover:text-white inline-flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </a>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedId === map.id && (
            <div className="px-4 py-4 bg-neutral-700/20 border-t border-neutral-700">
              <div className="flex gap-6">
                {/* Levelshot */}
                <div className="flex-shrink-0">
                  {editingId === map.id ? (
                    /* Image Edit Mode */
                    <div className="space-y-2">
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-64 h-36 object-cover rounded-lg border border-neutral-600"
                        />
                      ) : map.levelshotPath ? (
                        <img
                          src={getLevelshotUrl(map.id, map.updatedAt)}
                          alt={map.displayName || "Map levelshot"}
                          className="w-64 h-36 object-cover rounded-lg border border-neutral-600"
                        />
                      ) : (
                        <div className="w-64 h-36 bg-neutral-800 rounded-lg border border-neutral-600 flex items-center justify-center">
                          <span className="text-neutral-500 text-sm">No image</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            imageInputRef.current?.click();
                          }}
                          className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded hover:bg-neutral-600"
                        >
                          {map.levelshotPath ? "Replace" : "Upload"}
                        </button>
                        {imageFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageUpload(map.id);
                            }}
                            disabled={uploadingImage}
                            className="text-xs bg-etjump text-neutral-900 px-2 py-1 rounded hover:bg-etjump-600 hover:text-white disabled:opacity-50"
                          >
                            {uploadingImage ? "Uploading..." : "Save Image"}
                          </button>
                        )}
                        {map.levelshotPath && !imageFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageDelete(map.id);
                            }}
                            disabled={deletingImage}
                            className="text-xs bg-red-900 text-red-300 px-2 py-1 rounded hover:bg-red-800 disabled:opacity-50"
                          >
                            {deletingImage ? "Deleting..." : "Delete"}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Image View Mode */
                    map.levelshotPath ? (
                      <img
                        src={getLevelshotUrl(map.id, map.updatedAt)}
                        alt={map.displayName || "Map levelshot"}
                        className="w-64 h-36 object-cover rounded-lg border border-neutral-600"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-64 h-36 bg-neutral-800 rounded-lg border border-neutral-600 flex items-center justify-center">
                        <span className="text-neutral-500 text-sm">No preview</span>
                      </div>
                    )
                  )}
                </div>

                {/* Details / Edit Form */}
                <div className="flex-1 space-y-3">
                  {editingId === map.id ? (
                    /* Edit Form */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-neutral-500">Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full mt-1 text-sm bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500">Year</label>
                          <input
                            type="number"
                            value={editYear}
                            onChange={(e) =>
                              setEditYear(e.target.value ? parseInt(e.target.value) : "")
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="w-full mt-1 text-sm bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-neutral-500">Difficulty</label>
                          <select
                            value={editDifficulty}
                            onChange={(e) => setEditDifficulty(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full mt-1 text-sm bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white"
                          >
                            <option value="">Select...</option>
                            {DIFFICULTIES.map((d) => (
                              <option key={d} value={d}>
                                {d.charAt(0).toUpperCase() + d.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Map Types - Multi-select checkboxes */}
                      <div>
                        <label className="text-xs text-neutral-500">Types (can select multiple)</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {MAP_TYPES.map((type) => (
                            <label
                              key={type}
                              className={`text-xs px-2 py-1 rounded cursor-pointer ${
                                editMapTypes.includes(type)
                                  ? "bg-blue-900/50 text-blue-300 border border-blue-500"
                                  : "bg-neutral-800 text-neutral-400 border border-neutral-600"
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={editMapTypes.includes(type)}
                                onChange={() => toggleMapType(type)}
                                className="sr-only"
                              />
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Authors - tag input */}
                      <div>
                        <label className="text-xs text-neutral-500">Authors</label>
                        <div className="flex flex-wrap gap-1 mt-1 mb-2">
                          {editAuthors.map((author) => (
                            <span
                              key={author}
                              className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded flex items-center gap-1"
                            >
                              {author}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAuthor(author);
                                }}
                                className="text-neutral-500 hover:text-red-400"
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editAuthorInput}
                            onChange={(e) => setEditAuthorInput(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAuthor())}
                            placeholder="Add author..."
                            className="flex-1 text-sm bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white placeholder-neutral-500"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addAuthor();
                            }}
                            className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded hover:bg-neutral-600"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Features - All removable */}
                      <div>
                        <label className="text-xs text-neutral-500">Features (all can be removed)</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {editFeatures.map((feature) => (
                            <span
                              key={feature}
                              className="text-xs px-2 py-1 rounded flex items-center gap-1 bg-etjump/30 text-etjump"
                            >
                              {feature.replace(/_/g, " ")}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFeature(feature);
                                }}
                                className="hover:text-red-400"
                              >
                                x
                              </button>
                            </span>
                          ))}
                        </div>
                        {/* Add known features */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {FEATURES.filter(f => !editFeatures.includes(f)).map((feature) => (
                            <button
                              key={feature}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFeature(feature);
                              }}
                              className="text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-400 border border-neutral-600 hover:border-etjump"
                            >
                              + {feature.replace(/_/g, " ")}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={editCustomFeature}
                            onChange={(e) => setEditCustomFeature(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomFeature())}
                            placeholder="Add custom feature..."
                            className="flex-1 text-sm bg-neutral-800 border border-neutral-600 rounded px-2 py-1 text-white placeholder-neutral-500"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addCustomFeature();
                            }}
                            className="text-xs bg-neutral-700 text-neutral-300 px-2 py-1 rounded hover:bg-neutral-600"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Save/Cancel buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSave(map.id);
                          }}
                          disabled={savingId === map.id || !isAuthenticated}
                          className="text-xs bg-etjump text-neutral-900 px-3 py-1 rounded hover:bg-etjump-600 hover:text-white disabled:opacity-50"
                        >
                          {savingId === map.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                          className="text-xs bg-neutral-700 text-neutral-300 px-3 py-1 rounded hover:bg-neutral-600"
                        >
                          Cancel
                        </button>
                        {!isAuthenticated && (
                          <span className="text-xs text-yellow-500">Set key above first</span>
                        )}
                      </div>

                      {error && (
                        <p className="text-xs text-red-400">{error}</p>
                      )}
                    </div>
                  ) : (
                    /* View Mode */
                    <>
                      {/* Authors */}
                      {map.author && parseAuthors(map.author).length > 0 && (
                        <div>
                          <span className="text-xs text-neutral-500">Authors:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {parseAuthors(map.author).map((author) => (
                              <span
                                key={author}
                                className="text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded"
                              >
                                {author}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Features */}
                      {map.features && map.features.length > 0 && (
                        <div>
                          <span className="text-xs text-neutral-500">Features:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {map.features.map((feature) => (
                              <span
                                key={feature}
                                className="text-xs px-2 py-0.5 rounded bg-etjump/20 text-etjump"
                              >
                                {feature.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Size */}
                      <div>
                        <span className="text-xs text-neutral-500">Size:</span>
                        <span className="text-xs text-neutral-300 ml-1">
                          {formatFileSize(map.fileSize)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-2">
                        <Link
                          to={`/maps/${map.id}`}
                          className="text-sm text-etjump hover:underline"
                        >
                          View Details
                        </Link>

                        {isAuthenticated && (
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(map);
                              }}
                              className="text-xs bg-blue-900 text-blue-300 px-3 py-1 rounded hover:bg-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(map.id);
                              }}
                              disabled={deletingId === map.id}
                              className="text-xs bg-red-900 text-red-300 px-3 py-1 rounded hover:bg-red-800 disabled:opacity-50"
                            >
                              {deletingId === map.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        )}
                      </div>

                      {error && (
                        <p className="text-xs text-red-400">{error}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
