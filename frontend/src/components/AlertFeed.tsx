/**
 * Alert Feed — reverse-chronological list with severity/zone/time filtering.
 * Uses aria-live to announce new alerts to screen readers.
 */

import { useState, useEffect } from "react";
import { Bell, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { SeverityBadge } from "./SeverityBadge";
import { Skeleton } from "./SkeletonLoader";
import { fetchAlerts } from "@/lib/api";
import type { Alert, AlertFeed as AlertFeedType, AlertSeverity } from "@/types";

interface AlertFeedProps {
  initialAlerts?: Alert[];
}

export function AlertFeed({ initialAlerts }: AlertFeedProps) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts || []);
  const [loading, setLoading] = useState(!initialAlerts);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "">("");
  const [filterZone, setFilterZone] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true);
      try {
        const feed: AlertFeedType = await fetchAlerts({
          severity: filterSeverity || undefined,
          zoneId: filterZone || undefined,
          page,
          pageSize: 20,
        });
        setAlerts(feed.alerts);
        setHasNext(feed.hasNext);
      } catch {
        // Keep existing alerts on error
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, [filterSeverity, filterZone, page]);

  return (
    <section aria-label="Live alert feed" className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[var(--color-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
            Alert Feed
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
            {alerts.length}
          </span>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors bg-transparent border-none cursor-pointer"
          aria-expanded={showFilters}
          aria-controls="alert-filters"
        >
          <Filter size={14} />
          Filter
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div
          id="alert-filters"
          className="flex gap-2 px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-bg-elevated)] animate-fade-in"
        >
          <select
            value={filterSeverity}
            onChange={(e) => {
              setFilterSeverity(e.target.value as AlertSeverity | "");
              setPage(1);
            }}
            className="text-xs rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-1"
            aria-label="Filter by severity"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
          <input
            type="text"
            placeholder="Zone ID..."
            value={filterZone}
            onChange={(e) => {
              setFilterZone(e.target.value);
              setPage(1);
            }}
            className="text-xs rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)] px-2 py-1 flex-1"
            aria-label="Filter by zone"
          />
        </div>
      )}

      {/* Alert list */}
      <div
        className="flex-1 overflow-y-auto"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Alert entries"
      >
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton height="4rem" />
            <Skeleton height="4rem" />
            <Skeleton height="4rem" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell size={32} className="text-[var(--color-text-muted)] mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">
              No alerts matching filters — all clear.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {alerts.map((alert) => (
              <li key={alert.alertId} className="animate-slide-in-top">
                <button
                  onClick={() =>
                    setExpandedId(expandedId === alert.alertId ? null : alert.alertId)
                  }
                  className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg-hover)] transition-colors bg-transparent border-none cursor-pointer"
                  aria-expanded={expandedId === alert.alertId}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs text-[var(--color-text-muted)] font-mono">
                          {alert.zoneName || alert.zoneId}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)] truncate">
                        {alert.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[var(--color-text-muted)] flex-shrink-0">
                      <span className="text-xs font-mono">
                        {new Date(alert.createdAt).toLocaleTimeString()}
                      </span>
                      {expandedId === alert.alertId ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedId === alert.alertId && (
                  <div className="px-4 pb-3 animate-fade-in">
                    <div className="rounded-lg bg-[var(--color-bg-primary)] p-3 text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      <p className="font-semibold text-[var(--color-text-primary)] mb-1">
                        Reasoning:
                      </p>
                      <p className="mb-2">{alert.reasoning}</p>
                      {alert.suggestedActions.length > 0 && (
                        <>
                          <p className="font-semibold text-[var(--color-text-primary)] mb-1">
                            Suggested Actions:
                          </p>
                          <ul className="list-disc list-inside space-y-0.5">
                            {alert.suggestedActions.map((action: string, i: number) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {(page > 1 || hasNext) && (
          <div className="flex justify-center gap-2 p-3 border-t border-[var(--color-border)]">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="text-xs px-3 py-1 rounded-lg bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] disabled:opacity-50 hover:bg-[var(--color-bg-hover)] transition-colors border-none cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs text-[var(--color-text-muted)] self-center">
              Page {page}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!hasNext}
              className="text-xs px-3 py-1 rounded-lg bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] disabled:opacity-50 hover:bg-[var(--color-bg-hover)] transition-colors border-none cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
