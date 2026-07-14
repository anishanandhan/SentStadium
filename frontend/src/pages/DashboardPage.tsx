/**
 * Dashboard Page — main control room view.
 * Top bar, zone map, zone detail drawer, alert feed.
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, BarChart3, Upload, Settings } from "lucide-react";
import { ZoneMap } from "@/components/ZoneMap";
import { ZoneDetailDrawer } from "@/components/ZoneDetailDrawer";
import { AlertFeed } from "@/components/AlertFeed";
import { LiveStatusIndicator } from "@/components/LiveStatusIndicator";
import { SkeletonCard } from "@/components/SkeletonLoader";
import { AccessibilitySettings } from "@/components/AccessibilitySettings";
import { fetchZones } from "@/lib/api";
import type { ZoneData } from "@/types";

export function DashboardPage() {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "live" | "syncing" | "stale"
  >("syncing");
  const [showA11ySettings, setShowA11ySettings] = useState(false);
  const navigate = useNavigate();

  const loadZones = useCallback(async () => {
    try {
      const data = await fetchZones();
      setZones(data);
      setConnectionStatus("live");
    } catch {
      setConnectionStatus("stale");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling (simulating real-time for demo without Firestore)
  useEffect(() => {
    loadZones();
    const interval = setInterval(loadZones, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [loadZones]);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col">
      {/* ========== TOP BAR ========== */}
      <header className="sticky top-0 z-30 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-4 py-2.5 flex items-center justify-between">
        {/* Left: Logo + Name */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <Activity size={22} className="text-[var(--color-accent)]" />
            <span className="text-lg font-bold font-[var(--font-family-display)] text-[var(--color-text-primary)]">
              StadiumPulse
            </span>
          </Link>
          <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] font-medium">
            Control Room — Organizer View
          </span>
        </div>

        {/* Right: Status + Nav + Settings */}
        <div className="flex items-center gap-3">
          <LiveStatusIndicator status={connectionStatus} />

          <nav className="hidden md:flex items-center gap-1">
            <NavButton
              icon={<BarChart3 size={16} />}
              label="Historical"
              onClick={() => navigate("/dashboard/historical")}
            />
            <NavButton
              icon={<Upload size={16} />}
              label="Upload Data"
              onClick={() => navigate("/dashboard/upload")}
            />
          </nav>

          <button
            onClick={() => setShowA11ySettings(!showA11ySettings)}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-secondary)]"
            aria-label="Accessibility settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ========== MAIN CONTENT ========== */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Zone Map */}
        <section
          className="flex-1 p-4 lg:p-6 overflow-y-auto"
          aria-label="Stadium zone map"
        >
          <h1 className="sr-only">StadiumPulse Control Room Dashboard</h1>

          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <>
              {/* Zone summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <SummaryCard label="Total Zones" value={String(zones.length)} />
                <SummaryCard
                  label="Critical"
                  value={String(
                    zones.filter((z) => z.riskLevel === "critical").length,
                  )}
                  accent="var(--color-severity-critical)"
                />
                <SummaryCard
                  label="High Risk"
                  value={String(
                    zones.filter((z) => z.riskLevel === "high").length,
                  )}
                  accent="var(--color-severity-high)"
                />
                <SummaryCard
                  label="Avg Density"
                  value={`${(zones.reduce((s, z) => s + z.crowdDensity, 0) / Math.max(zones.length, 1)).toFixed(0)}%`}
                />
              </div>

              {/* Zone Map SVG */}
              <ZoneMap
                zones={zones}
                selectedZoneId={selectedZoneId}
                onZoneSelect={setSelectedZoneId}
              />
            </>
          )}
        </section>

        {/* Right: Alert Feed */}
        <aside
          className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex flex-col max-h-[40vh] lg:max-h-none overflow-hidden"
          aria-label="Alert feed panel"
        >
          <AlertFeed />
        </aside>
      </main>

      {/* ========== ZONE DETAIL DRAWER ========== */}
      <ZoneDetailDrawer
        zoneId={selectedZoneId}
        onClose={() => setSelectedZoneId(null)}
      />

      {/* ========== ACCESSIBILITY SETTINGS ========== */}
      {showA11ySettings && (
        <AccessibilitySettings onClose={() => setShowA11ySettings(false)} />
      )}
    </div>
  );
}

// --- Internal helper components ---

function NavButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors bg-transparent border-none cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-3">
      <div className="text-xs text-[var(--color-text-muted)] mb-1">{label}</div>
      <div
        className="text-xl font-bold font-[var(--font-family-mono)]"
        style={{ color: accent || "var(--color-text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}
