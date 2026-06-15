import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getMap,
  getDownloadUrl,
  getLevelshotUrl,
  formatFileSize,
  MapData,
} from "../api/maps";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "bg-green-900 text-green-300",
  Easy: "bg-green-800 text-green-200",
  Medium: "bg-yellow-900 text-yellow-300",
  Hard: "bg-red-900/80 text-red-300",
  Insane: "bg-purple-900 text-purple-300",
};

export default function MapDetail() {
  const { id } = useParams<{ id: string }>();
  const [map, setMap] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchMap = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const response = await getMap(parseInt(id));

        if (response.success) {
          setMap(response.data);
        } else {
          setError("Map not found");
        }
      } catch (err) {
        setError("Failed to load map");
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, [id]);

  const parseAuthors = (authorStr: string | null): string[] => {
    if (!authorStr) return [];
    return authorStr.split(",").map((a) => a.trim()).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-700 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-neutral-700 rounded w-1/4 mb-8"></div>
          <div className="aspect-video bg-neutral-700 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold text-red-400 mb-4">
          {error || "Map not found"}
        </h1>
        <Link to="/" className="text-etjump hover:underline">
          Back to maps
        </Link>
      </div>
    );
  }

  const authors = parseAuthors(map.author);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="text-neutral-400 hover:text-etjump mb-4 inline-block"
      >
        ← Back to maps
      </Link>

      <div className="bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700">
        {/* Levelshot */}
        {map.levelshotPath && !imageError ? (
          <div className="aspect-video">
            <img
              src={getLevelshotUrl(map.id, map.updatedAt)}
              alt={map.displayName || map.mapName || "Map levelshot"}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="aspect-video bg-neutral-900 flex items-center justify-center">
            <span className="text-neutral-600">No preview available</span>
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-etjump">
                {map.displayName || map.mapName || map.filename}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                {authors.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">by</span>
                    <div className="flex flex-wrap gap-1">
                      {authors.map((author, i) => (
                        <span key={author} className="text-neutral-300">
                          {author}
                          {i < authors.length - 1 && ","}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {map.releaseYear && (
                  <span className="text-neutral-500">({map.releaseYear})</span>
                )}
              </div>
            </div>

            <a
              href={getDownloadUrl(map.id)}
              className="bg-etjump text-neutral-900 font-semibold px-6 py-3 rounded-lg hover:bg-etjump-600 hover:text-white transition-colors inline-flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </a>
          </div>

          {/* Features */}
          {map.features && map.features.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-neutral-400 mb-2">
                Features
              </h2>
              <div className="flex flex-wrap gap-2">
                {map.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1 rounded-full text-sm bg-etjump/20 text-etjump"
                  >
                    {feature.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-700/50 rounded-lg p-4">
              <p className="text-neutral-500 text-sm">File Size</p>
              <p className="text-white font-medium">
                {formatFileSize(map.fileSize)}
              </p>
            </div>

            {map.difficulty && (
              <div className="bg-neutral-700/50 rounded-lg p-4">
                <p className="text-neutral-500 text-sm">Difficulty</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs mt-1 ${
                    DIFFICULTY_COLORS[map.difficulty] ||
                    "bg-neutral-700 text-neutral-300"
                  }`}
                >
                  {map.difficulty}
                </span>
              </div>
            )}

            {map.mapTypes && map.mapTypes.length > 0 && (
              <div className="bg-neutral-700/50 rounded-lg p-4">
                <p className="text-neutral-500 text-sm">Type</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {map.mapTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-block px-2 py-1 rounded text-xs bg-blue-900/50 text-blue-300"
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {map.releaseYear && (
              <div className="bg-neutral-700/50 rounded-lg p-4">
                <p className="text-neutral-500 text-sm">Release Year</p>
                <p className="text-white font-medium">{map.releaseYear}</p>
              </div>
            )}
          </div>

          {/* File info */}
          <div className="border-t border-neutral-700 pt-4">
            <div className="text-sm text-neutral-500">
              <span className="font-mono">{map.filename}</span>
              <span className="mx-2">|</span>
              <span className="font-mono text-xs">{map.checksum.slice(0, 16)}...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
