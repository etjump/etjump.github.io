import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { getMaps, MapData } from "../api/maps";
import MapTable from "../components/MapTable";
import SecretKeyInput from "../components/SecretKeyInput";
import { useAuth } from "../context/AuthContext";

const DIFFICULTIES = ["Beginner", "Easy", "Medium", "Hard", "Insane"];
const MAP_TYPES = ["customs", "gamma", "originals"]; // Alphabetical
const PAGE_SIZES = [10, 25, 50, 100];

// Generate year options from 2000 to current year
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i);

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [maps, setMaps] = useState<MapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [year, setYear] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Type dropdown state
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setTypeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMaps({
        page,
        limit: pageSize,
        search: search || undefined,
        difficulty: difficulty || undefined,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        year: year ? Number(year) : undefined,
      });

      if (response.success) {
        setMaps(response.data);
        setTotalPages(response.meta.totalPages);
        setTotal(response.meta.total);
      } else {
        setError(response.error || "Failed to load maps");
      }
    } catch (err) {
      console.error("Failed to fetch maps:", err);
      setError(err instanceof Error ? err.message : "Failed to load maps");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, difficulty, selectedTypes, year]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const hasActiveFilters = search || difficulty || selectedTypes.length > 0 || year;

  const resetFilters = () => {
    setSearch("");
    setDifficulty("");
    setSelectedTypes([]);
    setYear("");
    setPage(1);
  };

  const getTypeLabel = () => {
    if (selectedTypes.length === 0) return "All types";
    if (selectedTypes.length === 1) return selectedTypes[0].charAt(0).toUpperCase() + selectedTypes[0].slice(1);
    return `${selectedTypes.length} types`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-etjump mb-2">ETJump Maps</h1>
          <p className="text-neutral-400">
            Browse and download community maps for ETJump
          </p>
        </div>
        {isAuthenticated && (
          <Link
            to="/upload"
            className="bg-etjump text-neutral-900 font-semibold px-4 py-2 rounded-lg hover:bg-etjump-600 hover:text-white transition-colors"
          >
            Upload Map
          </Link>
        )}
      </div>

      <SecretKeyInput />

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap items-center">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name or author..."
          className="flex-1 min-w-[200px] bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-etjump"
        />

        {/* Year filter */}
        <select
          value={year}
          onChange={(e) => {
            setYear(e.target.value ? Number(e.target.value) : "");
            setPage(1);
          }}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-etjump appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M2%204l4%204%204-4%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_12px_center]"
        >
          <option value="">All years</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Type filter (dropdown with checkboxes) */}
        <div className="relative" ref={typeDropdownRef}>
          <button
            type="button"
            onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
            className={`bg-neutral-800 border rounded-lg px-4 py-2 pr-10 text-white focus:outline-none min-w-[140px] text-left appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M2%204l4%204%204-4%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_12px_center] ${
              selectedTypes.length > 0 ? "border-etjump" : "border-neutral-700"
            }`}
          >
            {getTypeLabel()}
          </button>
          {typeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-10 min-w-[160px]">
              {MAP_TYPES.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => handleTypeToggle(type)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-etjump focus:ring-etjump"
                  />
                  <span className="text-neutral-300">
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </span>
                </label>
              ))}
              {selectedTypes.length > 0 && (
                <button
                  onClick={() => {
                    setSelectedTypes([]);
                    setPage(1);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300 hover:bg-neutral-700 border-t border-neutral-700"
                >
                  Clear selection
                </button>
              )}
            </div>
          )}
        </div>

        {/* Difficulty filter */}
        <select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            setPage(1);
          }}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-etjump appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M2%204l4%204%204-4%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_12px_center]"
        >
          <option value="">All difficulties</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Reset filters button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-neutral-500 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reset
          </button>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-neutral-400 text-sm mb-4">
          {total === 0
            ? "No maps found"
            : `Showing ${maps.length} of ${total} maps`}
        </p>
      )}

      {error && (
        <div className="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <MapTable maps={maps} loading={loading} onMapDeleted={fetchMaps} onMapUpdated={fetchMaps} />

      {/* Pagination and Page Size */}
      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-2 bg-neutral-800 rounded-lg disabled:opacity-50 hover:bg-neutral-700 transition-colors text-sm"
            >
              First
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-neutral-800 rounded-lg disabled:opacity-50 hover:bg-neutral-700 transition-colors"
            >
              Prev
            </button>

            <span className="px-4 py-2 text-neutral-400">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-neutral-800 rounded-lg disabled:opacity-50 hover:bg-neutral-700 transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-2 bg-neutral-800 rounded-lg disabled:opacity-50 hover:bg-neutral-700 transition-colors text-sm"
            >
              Last
            </button>
          </div>
        )}

        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-neutral-400 text-sm">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-etjump appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M2%204l4%204%204-4%22%2f%3e%3c%2fsvg%3e')] bg-no-repeat bg-[right_8px_center]"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-neutral-400 text-sm">per page</span>
        </div>
      </div>
    </div>
  );
}
