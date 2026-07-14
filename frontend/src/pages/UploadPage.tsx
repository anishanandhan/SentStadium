/**
 * Upload Page — data upload/test panel.
 * File upload, schema docs, validation errors, dataset state management.
 */

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Activity,
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { uploadData, resetData } from "@/lib/api";
import type { UploadResult, UploadValidationError } from "@/types";

const EXPECTED_SCHEMA = [
  { field: "zone_id", type: "string", required: true, description: "Unique zone identifier (e.g., 'zone-a')" },
  { field: "timestamp", type: "ISO 8601", required: true, description: "Reading timestamp (e.g., '2026-07-10T14:30:00Z')" },
  { field: "crowd_density", type: "number (0-100)", required: true, description: "Current crowd density percentage" },
  { field: "heat_index", type: "number", required: true, description: "Heat index in Celsius" },
  { field: "entry_rate", type: "number (≥0)", required: false, description: "Fans entering per minute" },
  { field: "current_occupancy", type: "integer", required: false, description: "Current fan count in zone" },
  { field: "capacity", type: "integer", required: false, description: "Maximum zone capacity" },
  { field: "languages_present", type: "string[]", required: false, description: "ISO 639-1 language codes (e.g., ['en', 'es'])" },
];

export function UploadPage() {
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadData(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setError(null);
    try {
      const res = await resetData();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-4">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors no-underline"
        >
          <ArrowLeft size={16} />
          Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[var(--color-accent)]" />
          <h1 className="text-base font-semibold text-[var(--color-text-primary)] font-[var(--font-family-display)]">
            Data Upload &amp; Testing
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Upload Zone */}
        <section className="glass-card p-6" aria-label="File upload">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Upload Dataset
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Upload a CSV or JSON file to replace the current zone data. The dashboard
            will immediately reflect your uploaded dataset.
          </p>

          {/* Drag-and-drop area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              dragActive
                ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)]"
                : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Drop file here or click to browse"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="hidden"
              aria-hidden="true"
            />
            <div className="flex justify-center gap-3 mb-3">
              <FileSpreadsheet size={28} className="text-[var(--color-text-muted)]" />
              <FileJson size={28} className="text-[var(--color-text-muted)]" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Upload size={16} className="animate-bounce" /> Uploading...
                </span>
              ) : (
                <>
                  Drop a <strong>.csv</strong> or <strong>.json</strong> file here, or{" "}
                  <span className="text-[var(--color-accent)] underline">browse</span>
                </>
              )}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Max 10 MB</p>
          </div>

          {/* Reset button */}
          <div className="flex justify-end mt-3">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors bg-transparent border-none cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={resetting ? "animate-spin" : ""} />
              Reset to synthetic data
            </button>
          </div>
        </section>

        {/* Result Banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-severity-high-bg)] border border-[var(--color-severity-high)]">
            <AlertTriangle size={18} className="text-[var(--color-severity-high)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--color-severity-high)]">Upload Failed</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-[var(--color-text-muted)]">
              <X size={16} />
            </button>
          </div>
        )}

        {result && (
          <div
            className={`flex items-start gap-3 p-4 rounded-xl ${
              result.success
                ? "bg-[var(--color-severity-low-bg)] border border-[var(--color-severity-low)]"
                : "bg-[var(--color-severity-high-bg)] border border-[var(--color-severity-high)]"
            }`}
          >
            {result.success ? (
              <CheckCircle size={18} className="text-[var(--color-severity-low)] flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={18} className="text-[var(--color-severity-high)] flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-medium ${result.success ? "text-[var(--color-severity-low)]" : "text-[var(--color-severity-high)]"}`}>
                {result.message}
              </p>
              {result.filename && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  File: {result.filename} · {result.rowsAccepted} accepted · {result.rowsRejected} rejected
                </p>
              )}

              {/* Validation errors */}
              {result.errors.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                    Validation Errors:
                  </p>
                  <ul className="space-y-1">
                    {result.errors.map((err: UploadValidationError, i: number) => (
                      <li key={i} className="text-xs text-[var(--color-text-secondary)]">
                        Row {err.row}, field <code className="text-[var(--color-accent)]">{err.field}</code>: {err.message}
                        {err.value && (
                          <span className="text-[var(--color-text-muted)]"> (value: "{err.value}")</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Schema Documentation */}
        <section className="glass-card p-6" aria-label="Expected data schema">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Expected Schema
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Your CSV or JSON file should contain rows with the following fields:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">
                  <th className="py-2 pr-4">Field</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Required</th>
                  <th className="py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {EXPECTED_SCHEMA.map((field) => (
                  <tr key={field.field}>
                    <td className="py-2 pr-4 font-mono text-xs text-[var(--color-accent)]">
                      {field.field}
                    </td>
                    <td className="py-2 pr-4 text-xs text-[var(--color-text-secondary)]">
                      {field.type}
                    </td>
                    <td className="py-2 pr-4">
                      {field.required ? (
                        <span className="text-xs text-[var(--color-severity-moderate)]">Yes</span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-muted)]">No</span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-[var(--color-text-secondary)]">
                      {field.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Example snippets */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">
                CSV Example
              </h3>
              <pre className="text-xs font-mono bg-[var(--color-bg-primary)] rounded-lg p-3 overflow-x-auto text-[var(--color-text-secondary)]">
{`zone_id,timestamp,crowd_density,heat_index,entry_rate
zone-a,2026-07-10T14:30:00Z,72.5,38.2,25.0
zone-b,2026-07-10T14:30:00Z,45.0,41.0,12.0
zone-c,2026-07-10T14:30:00Z,88.0,39.5,35.0`}
              </pre>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">
                JSON Example
              </h3>
              <pre className="text-xs font-mono bg-[var(--color-bg-primary)] rounded-lg p-3 overflow-x-auto text-[var(--color-text-secondary)]">
{`[
  {
    "zone_id": "zone-a",
    "timestamp": "2026-07-10T14:30:00Z",
    "crowd_density": 72.5,
    "heat_index": 38.2,
    "entry_rate": 25.0
  }
]`}
              </pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
