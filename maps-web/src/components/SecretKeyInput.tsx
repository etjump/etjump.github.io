import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { validateKey } from "../api/maps";

export default function SecretKeyInput() {
  const { secretKey, setSecretKey, isAuthenticated, setIsValidated } = useAuth();
  const [showInput, setShowInput] = useState(false);
  const [tempKey, setTempKey] = useState(secretKey);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input when shown
  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showInput]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowInput(false);
        setError(null);
      }
    };
    if (showInput) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInput]);

  const handleSave = async () => {
    if (!tempKey.trim()) {
      setError("Please enter a key");
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const result = await validateKey(tempKey);
      if (result.success) {
        setSecretKey(tempKey);
        setIsValidated(true);
        setShowInput(false);
      } else {
        setError("Invalid key");
        setIsValidated(false);
      }
    } catch {
      setError("Failed to validate key");
      setIsValidated(false);
    } finally {
      setValidating(false);
    }
  };

  const handleClear = () => {
    setSecretKey("");
    setTempKey("");
    setIsValidated(false);
    setShowInput(false);
    setError(null);
  };

  return (
    <div ref={containerRef} className="relative inline-block mb-4">
      <button
        onClick={() => {
          setTempKey(secretKey);
          setShowInput(!showInput);
        }}
        className={`p-2 rounded-lg transition-colors ${
          isAuthenticated
            ? "bg-green-900/50 text-green-400 hover:bg-green-900"
            : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600 hover:text-white"
        }`}
        title={isAuthenticated ? "Secret key is set" : "Set secret key"}
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
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      </button>

      {showInput && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-neutral-800 border border-neutral-600 rounded-lg p-3 shadow-xl min-w-[280px]">
          <div className="text-xs text-neutral-400 mb-2">
            {isAuthenticated ? "Update or clear secret key" : "Enter secret key to edit maps"}
          </div>
          <input
            ref={inputRef}
            type="password"
            value={tempKey}
            onChange={(e) => {
              setTempKey(e.target.value);
              setError(null);
            }}
            placeholder="Enter secret key..."
            disabled={validating}
            className="w-full text-sm bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-white placeholder-neutral-400 focus:outline-none focus:border-etjump mb-2 disabled:opacity-50"
            onKeyDown={(e) => e.key === "Enter" && !validating && handleSave()}
          />
          {error && (
            <div className="text-xs text-red-400 mb-2">{error}</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={validating}
              className="flex-1 text-sm bg-etjump text-neutral-900 px-3 py-1.5 rounded hover:bg-etjump-600 hover:text-white disabled:opacity-50"
            >
              {validating ? "Validating..." : "Save"}
            </button>
            {isAuthenticated && (
              <button
                onClick={handleClear}
                disabled={validating}
                className="text-sm bg-red-900/50 text-red-300 px-3 py-1.5 rounded hover:bg-red-900 disabled:opacity-50"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => {
                setShowInput(false);
                setError(null);
              }}
              disabled={validating}
              className="text-sm text-neutral-400 px-3 py-1.5 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
