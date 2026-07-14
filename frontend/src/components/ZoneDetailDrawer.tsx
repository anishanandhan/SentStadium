/**
 * Zone Detail Drawer — slides in from the right when a zone is selected.
 * Shows zone data, sparklines, and AI recommendation.
 */

import { useEffect, useState, useCallback } from "react";
import { X, Thermometer, Users, ArrowUpRight, Sun } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { SparklineChart } from "./SparklineChart";
import { AIRecommendationCard } from "./AIRecommendationCard";
import { Skeleton } from "./SkeletonLoader";
import { fetchZoneDetail, triggerReasoning } from "@/lib/api";
import type { ZoneDetail, ReasoningOutput, ZoneTrend } from "@/types";

interface ZoneDetailDrawerProps {
  zoneId: string | null;
  onClose: () => void;
}

export function ZoneDetailDrawer({ zoneId, onClose }: ZoneDetailDrawerProps) {
  const [detail, setDetail] = useState<ZoneDetail | null>(null);
  const [recommendation, setRecommendation] = useState<ReasoningOutput | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [reasoningLoading, setReasoningLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadZoneDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchZoneDetail(id);
      setDetail(data);
      if (data.latestRecommendation) {
        setRecommendation(
          data.latestRecommendation as unknown as ReasoningOutput,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load zone data");
    } finally {
      setLoading(false);
    }
  }, []);

  const runReasoning = useCallback(async (id: string) => {
    setReasoningLoading(true);
    try {
      const result = await triggerReasoning(id);
      setRecommendation(result);
    } catch {
      // Keep existing recommendation as fallback
    } finally {
      setReasoningLoading(false);
    }
  }, []);

  useEffect(() => {
    if (zoneId) {
      loadZoneDetail(zoneId);
      runReasoning(zoneId);
    }
  }, [zoneId, loadZoneDetail, runReasoning]);

  // Keyboard: Escape closes
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (!zoneId) return null;

  const zone = detail?.zone;
  const history = detail?.history;

  const densityData =
    history?.trends.map((t: ZoneTrend) => ({
      value: t.crowdDensity,
      timestamp: t.timestamp,
    })) || [];
  const heatData =
    history?.trends.map((t: ZoneTrend) => ({
      value: t.heatIndex,
      timestamp: t.timestamp,
    })) || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--color-bg-secondary)] border-l border-[var(--color-border)] z-50 overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label={`Zone detail: ${zone?.zoneName || zoneId}`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] font-[var(--font-family-display)]">
              {zone?.zoneName || zoneId}
            </h2>
            {zone && (
              <SeverityBadge severity={zone.riskLevel} className="mt-1" />
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors text-[var(--color-text-secondary)]"
            aria-label="Close zone detail"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {error && (
            <div className="rounded-lg bg-[var(--color-severity-high-bg)] border border-[var(--color-severity-high)] p-3 text-sm text-[var(--color-severity-high)]">
              {error}
            </div>
          )}

          {loading ? (
            <>
              <Skeleton height="6rem" />
              <Skeleton height="6rem" />
              <Skeleton height="10rem" />
            </>
          ) : zone ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<Users size={16} />}
                  label="Crowd Density"
                  value={`${zone.crowdDensity.toFixed(1)}%`}
                  sub={`${zone.currentOccupancy.toLocaleString()} / ${zone.capacity.toLocaleString()}`}
                />
                <StatTile
                  icon={<Thermometer size={16} />}
                  label="Heat Index"
                  value={`${zone.heatIndex.toFixed(1)}°C`}
                  sub={`${((zone.heatIndex * 9) / 5 + 32).toFixed(0)}°F`}
                />
                <StatTile
                  icon={<ArrowUpRight size={16} />}
                  label="Entry Rate"
                  value={`${zone.entryRate.toFixed(0)}/min`}
                  sub="fans entering"
                />
                <StatTile
                  icon={<Sun size={16} />}
                  label="Shade / Hydration"
                  value={`${zone.hasShade ? "☀ Yes" : "✕ No"}`}
                  sub={
                    zone.hasHydrationPoint
                      ? "💧 Hydration point"
                      : "No hydration"
                  }
                />
              </div>

              {/* Sparklines */}
              <div className="space-y-3">
                <div className="rounded-xl bg-[var(--color-bg-elevated)] p-3">
                  <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">
                    Density Trend (15 min)
                  </h3>
                  <SparklineChart
                    data={densityData}
                    color="var(--color-accent)"
                    height={50}
                    label="Crowd density"
                  />
                </div>
                <div className="rounded-xl bg-[var(--color-bg-elevated)] p-3">
                  <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-2">
                    Heat Index Trend (15 min)
                  </h3>
                  <SparklineChart
                    data={heatData}
                    color="var(--color-severity-high)"
                    height={50}
                    label="Heat index"
                  />
                </div>
              </div>

              {/* AI Recommendation */}
              <AIRecommendationCard
                recommendation={recommendation}
                isLoading={reasoningLoading}
              />
            </>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              Zone not found.
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

// --- Internal StatTile component ---

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--color-bg-elevated)] p-3">
      <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] mb-1">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-lg font-semibold font-[var(--font-family-mono)] text-[var(--color-text-primary)]">
        {value}
      </div>
      <div className="text-xs text-[var(--color-text-muted)]">{sub}</div>
    </div>
  );
}
