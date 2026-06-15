import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  uploadMap,
  updateMap,
  uploadImage,
  formatFileSize,
} from "../api/maps";
import { useAuth } from "../context/AuthContext";
import SecretKeyInput from "../components/SecretKeyInput";

const DIFFICULTIES = ["Beginner", "Easy", "Medium", "Hard", "Insane"];
const FEATURES = ["portalgun", "pushers", "save_zones", "timerun"]; // Alphabetical
const MAP_TYPES = ["customs", "gamma", "originals"]; // Alphabetical

interface PendingFile {
  file: File;
  id: string;
}

export default function Upload() {
  const navigate = useNavigate();
  const { secretKey, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Bulk upload state - files stored in memory, not uploaded yet
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  // Upload/save state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Form fields (user fills these before upload)
  const [displayName, setDisplayName] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  const [authorInput, setAuthorInput] = useState("");
  const [releaseYear, setReleaseYear] = useState<number | "">("");
  const [difficulty, setDifficulty] = useState("");
  const [mapTypes, setMapTypes] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [customFeature, setCustomFeature] = useState("");

  // Image upload (optional, uploaded after map is saved)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleFilesSelect = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const pk3Files = fileArray.filter(f => f.name.toLowerCase().endsWith(".pk3"));

    if (pk3Files.length === 0) {
      setError("Please select .pk3 files");
      return;
    }

    const newPending: PendingFile[] = pk3Files.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));

    setPendingFiles(newPending);
    setCurrentIndex(0);
    setCompletedCount(0);
    resetFormFields();
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature]
    );
  };

  const addAuthor = () => {
    const trimmed = authorInput.trim();
    if (trimmed && !authors.includes(trimmed)) {
      setAuthors([...authors, trimmed]);
      setAuthorInput("");
    }
  };

  const removeAuthor = (author: string) => {
    setAuthors(authors.filter((a) => a !== author));
  };

  const addCustomFeature = () => {
    const trimmed = customFeature.trim().toLowerCase().replace(/\s+/g, "_");
    if (trimmed && !selectedFeatures.includes(trimmed)) {
      setSelectedFeatures([...selectedFeatures, trimmed]);
      setCustomFeature("");
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

  const resetFormFields = () => {
    setDisplayName("");
    setAuthors([]);
    setAuthorInput("");
    setReleaseYear("");
    setDifficulty("");
    setMapTypes([]);
    setSelectedFeatures([]);
    setCustomFeature("");
    setImageFile(null);
    setImagePreview(null);
  };

  // Upload current file + details + optional image all at once
  const handleSaveAndNext = async () => {
    const currentFile = pendingFiles[currentIndex];
    if (!currentFile) return;

    if (!isAuthenticated) {
      setError("Please set the secret key above first");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Step 1: Upload the PK3 file
      const uploadResponse = await uploadMap(currentFile.file, secretKey);

      if (!uploadResponse.success) {
        setError((uploadResponse as any).error || "Upload failed");
        setSaving(false);
        return;
      }

      const uploadedMap = uploadResponse.data;

      // Step 2: Update with user-provided details
      const updateResponse = await updateMap(
        uploadedMap.id,
        {
          displayName: displayName || undefined,
          author: authors.length > 0 ? authors.join(", ") : undefined,
          releaseYear: releaseYear ? Number(releaseYear) : undefined,
          difficulty: difficulty || undefined,
          mapTypes: mapTypes,
          features: selectedFeatures.length > 0 ? selectedFeatures : uploadedMap.features,
        },
        secretKey
      );

      if (!updateResponse.success) {
        setError((updateResponse as any).error || "Failed to save details");
        setSaving(false);
        return;
      }

      // Step 3: Upload image if provided
      if (imageFile) {
        const imageResponse = await uploadImage(uploadedMap.id, imageFile, secretKey);
        if (!imageResponse.success) {
          // Image upload failed but map was saved - continue anyway
          console.warn("Image upload failed:", (imageResponse as any).error);
        }
      }

      // Success - move to next file or finish
      const newCompletedCount = completedCount + 1;
      setCompletedCount(newCompletedCount);

      if (currentIndex < pendingFiles.length - 1) {
        // More files to process
        resetFormFields();
        setCurrentIndex(currentIndex + 1);
      } else {
        // All done
        navigate("/");
      }
    } catch (err) {
      setError("Failed to upload map. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Skip current file without uploading
    if (currentIndex < pendingFiles.length - 1) {
      resetFormFields();
      setCurrentIndex(currentIndex + 1);
    } else {
      // All done (some may have been skipped)
      navigate("/");
    }
  };

  const handleCancel = () => {
    // Cancel all remaining files - they're just in memory, not uploaded
    navigate("/");
  };

  const handleReset = () => {
    setPendingFiles([]);
    setCurrentIndex(0);
    setCompletedCount(0);
    resetFormFields();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const currentFile = pendingFiles[currentIndex];
  const totalFiles = pendingFiles.length;
  const remainingFiles = totalFiles - currentIndex;

  // Show form to fill details for current file (file is NOT uploaded yet)
  if (currentFile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress indicator for bulk upload */}
        {totalFiles > 1 && (
          <div className="mb-6 bg-neutral-800 rounded-lg p-4 border border-neutral-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-neutral-300 font-medium">
                Map {currentIndex + 1} of {totalFiles}
              </span>
              <span className="text-neutral-500 text-sm">
                {completedCount} saved, {remainingFiles} remaining
              </span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-2">
              <div
                className="bg-etjump h-2 rounded-full transition-all"
                style={{ width: `${(currentIndex / totalFiles) * 100}%` }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingFiles.map((pf, idx) => (
                <span
                  key={pf.id}
                  className={`text-xs px-2 py-1 rounded ${
                    idx < currentIndex
                      ? "bg-green-900/50 text-green-300"
                      : idx === currentIndex
                      ? "bg-etjump/20 text-etjump border border-etjump"
                      : "bg-neutral-700 text-neutral-500"
                  }`}
                >
                  {pf.file.name.length > 20
                    ? pf.file.name.slice(0, 17) + "..."
                    : pf.file.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-etjump/10 border border-etjump/30 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-etjump">
            {currentFile.file.name}
          </h2>
          <p className="text-neutral-300 text-sm">
            Fill in the details below. The file will be uploaded when you click Save.
          </p>
          <p className="text-neutral-400 text-xs mt-1">
            Size: {formatFileSize(currentFile.file.size)}
          </p>
        </div>

        <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
          {/* Image Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Preview Image
            </label>
            <div className="flex gap-4 items-start">
              {/* Preview Image */}
              <div className="flex-shrink-0 w-64 h-36">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg border border-neutral-600"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-700 rounded-lg border border-neutral-600 flex items-center justify-center">
                    <span className="text-neutral-500 text-sm">No image selected</span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-sm bg-neutral-700 text-neutral-300 px-4 py-2 rounded hover:bg-neutral-600"
                >
                  Choose Image
                </button>
                {imageFile && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-400">{imageFile.name}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="mt-1 text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <p className="text-xs text-neutral-500 mt-2">
                  Image will be resized to 640x360
                </p>
              </div>
            </div>
          </div>

          {/* Form fields */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Map name (optional, will use filename if empty)"
                className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-etjump"
              />
            </div>

            {/* Authors - tag input */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Authors
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {authors.map((author) => (
                  <span
                    key={author}
                    className="bg-neutral-700 text-neutral-300 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    {author}
                    <button
                      type="button"
                      onClick={() => removeAuthor(author)}
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
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAuthor())}
                  placeholder="Add author..."
                  className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-etjump"
                />
                <button
                  type="button"
                  onClick={addAuthor}
                  className="bg-neutral-600 text-white px-4 py-2 rounded-lg hover:bg-neutral-500"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Year and Difficulty on same row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Release Year
                </label>
                <input
                  type="number"
                  value={releaseYear}
                  onChange={(e) =>
                    setReleaseYear(e.target.value ? parseInt(e.target.value) : "")
                  }
                  placeholder="e.g., 2024"
                  min="2000"
                  max={new Date().getFullYear()}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-etjump"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-etjump appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M2%204l4%204%204-4%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_12px_center]"
                >
                  <option value="">Select difficulty...</option>
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Types - Multi-select */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Types (can select multiple)
              </label>
              <div className="flex flex-wrap gap-2">
                {MAP_TYPES.map((type) => (
                  <label
                    key={type}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      mapTypes.includes(type)
                        ? "bg-sky-900/30 border border-sky-500 text-sky-300"
                        : "bg-neutral-700 border border-neutral-600 hover:border-neutral-500 text-neutral-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={mapTypes.includes(type)}
                      onChange={() => setMapTypes(prev =>
                        prev.includes(type)
                          ? prev.filter(t => t !== type)
                          : [...prev, type]
                      )}
                      className="sr-only"
                    />
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Features (can select multiple)
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {FEATURES.map((feature) => (
                  <label
                    key={feature}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      selectedFeatures.includes(feature)
                        ? "bg-etjump/20 border border-etjump text-etjump"
                        : "bg-neutral-700 border border-neutral-600 hover:border-neutral-500 text-neutral-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFeatures.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="sr-only"
                    />
                    {feature.replace(/_/g, " ")}
                  </label>
                ))}
                {/* Custom features */}
                {selectedFeatures
                  .filter((f) => !FEATURES.includes(f))
                  .map((feature) => (
                    <span
                      key={feature}
                      className="bg-etjump/20 text-etjump px-3 py-2 rounded-lg flex items-center gap-2"
                    >
                      {feature.replace(/_/g, " ")}
                      <button
                        type="button"
                        onClick={() => handleFeatureToggle(feature)}
                        className="text-etjump hover:text-red-400"
                      >
                        x
                      </button>
                    </span>
                  ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customFeature}
                  onChange={(e) => setCustomFeature(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomFeature())}
                  placeholder="Add custom feature..."
                  className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-etjump"
                />
                <button
                  type="button"
                  onClick={addCustomFeature}
                  className="bg-neutral-600 text-white px-4 py-2 rounded-lg hover:bg-neutral-500"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Features will also be auto-detected from the BSP file when uploaded.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleSaveAndNext}
              disabled={saving || !isAuthenticated}
              className="bg-etjump text-neutral-900 font-semibold px-6 py-2 rounded-lg hover:bg-etjump-600 hover:text-white disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Uploading..."
                : totalFiles > 1 && currentIndex < totalFiles - 1
                ? "Save & Next"
                : "Save & Finish"}
            </button>

            {totalFiles > 1 && (
              <button
                onClick={handleSkip}
                disabled={saving}
                className="bg-neutral-700 text-white px-6 py-2 rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-50"
              >
                {currentIndex < totalFiles - 1 ? "Skip" : "Skip & Finish"}
              </button>
            )}

            {totalFiles > 1 && currentIndex < totalFiles - 1 ? (
              <button
                onClick={handleCancel}
                disabled={saving}
                className="bg-neutral-700 text-neutral-400 px-6 py-2 rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-50"
              >
                Cancel Remaining
              </button>
            ) : totalFiles <= 1 ? (
              <button
                onClick={handleReset}
                disabled={saving}
                className="bg-neutral-700 text-white px-6 py-2 rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            ) : null}
          </div>

          {!isAuthenticated && (
            <p className="mt-4 text-yellow-400 text-sm">
              Please enter the secret key at the top of the page to upload maps.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Initial file selection screen
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-etjump mb-2">Upload Maps</h1>
        <p className="text-neutral-400">
          Upload one or more .pk3 map files. Select multiple files to bulk upload
          and fill in details for each one.
        </p>
      </div>

      <SecretKeyInput />

      <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 space-y-6">
        {/* File drop zone */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            PK3 Files
          </label>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-etjump bg-etjump/10"
                : "border-neutral-600 hover:border-neutral-500"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pk3"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesSelect(e.target.files);
                }
              }}
              className="hidden"
            />

            <div>
              <svg
                className="w-12 h-12 mx-auto text-neutral-500 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-neutral-400">
                Drag and drop .pk3 files here, or click to select
              </p>
              <p className="text-neutral-500 text-sm mt-2">
                You can select multiple files for bulk upload
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!isAuthenticated && (
          <p className="text-yellow-400 text-sm">
            Please enter the secret key above to upload maps.
          </p>
        )}
      </div>
    </div>
  );
}
