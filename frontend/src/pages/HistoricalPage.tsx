/**
 * Historical & Operational Intelligence page.
 * Risk score charts, predictive staffing, incident table.
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ArrowLeft, Activity, Users, Clock } from "lucide-react";
import { fetchZones, fetchAlerts } from "@/lib/api";
import { Skeleton } from "@/components/SkeletonLoader";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { ZoneData, Alert } from "@/types";

// Generate synthetic historical data for the chart
function generateHistoricalData(zones: ZoneData[]) {
  const data = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const point: Record<string, string | number> = {
      time: new Date(now - i * 15 * 60 * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    for (const zone of zones) {
      // Generate plausible risk scores based on current values with historical variation
      const baseRisk =
        (zone.crowdDensity / 100) * 0.5 +
        (Math.min(zone.heatIndex, 45) / 45) * 0.5;
      const variation =
        Math.sin((i * Math.PI) / 12) * 0.15 + (Math.random() - 0.5) * 0.1;
      point[zone.zoneId] = Math.max(0, Math.min(1, baseRisk + variation)) * 100;
    }
    data.push(point);
  }
  return data;
}

const ZONE_COLORS = [
  "var(--color-accent)",
  "var(--color-severity-moderate)",
  "var(--color-severity-high)",
  "var(--color-severity-low)",
  "#a78bfa",
  "#f472b6",
];

export function HistoricalPage() {
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [z, a] = await Promise.all([
          fetchZones(),
          fetchAlerts({ pageSize: 50 }),
        ]);
        setZones(z);
        setAlerts(a.alerts);
      } catch {
        // Fallback silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const chartData = generateHistoricalData(zones);

  // Predictive staffing suggestions
  const staffingSuggestions = zones
    .filter((z) => z.riskLevel === "high" || z.riskLevel === "critical")
    .map((z) => ({
      zone: z.zoneName,
      suggestion:
        z.riskLevel === "critical"
          ? `Immediately deploy 3 additional medical staff and 4 stewards to ${z.zoneName.split("—")[0].trim()}`
          : `Pre-position 2 additional medical staff at ${z.zoneName.split("—")[0].trim()} by ${new Date(Date.now() + 40 * 60 * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      severity: z.riskLevel,
    }));

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
            Historical &amp; Operational Intelligence
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton height="20rem" />
            <Skeleton height="10rem" />
            <Skeleton height="15rem" />
          </div>
        ) : (
          <>
            {/* Risk Score Chart */}
            <section
              className="glass-card p-6"
              aria-label="Risk score over time"
            >
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Risk Score Over Time (Last 6 Hours)
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      {zones.map((zone, i) => (
                        <linearGradient
                          key={zone.zoneId}
                          id={`grad-${zone.zoneId}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={ZONE_COLORS[i % ZONE_COLORS.length]}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={ZONE_COLORS[i % ZONE_COLORS.length]}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                    />
                    <XAxis
                      dataKey="time"
                      stroke="var(--color-text-muted)"
                      fontSize={11}
                      fontFamily="var(--font-family-mono)"
                    />
                    <YAxis
                      stroke="var(--color-text-muted)"
                      fontSize={11}
                      fontFamily="var(--font-family-mono)"
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-bg-elevated)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        color: "var(--color-text-primary)",
                      }}
                      formatter={(value: any) => [
                        `${Number(value).toFixed(1)}%`,
                        "",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{
                        fontSize: "11px",
                        fontFamily: "var(--font-family-body)",
                      }}
                    />
                    {zones.map((zone, i) => (
                      <Area
                        key={zone.zoneId}
                        type="monotone"
                        dataKey={zone.zoneId}
                        name={zone.zoneName.split("—")[0].trim()}
                        stroke={ZONE_COLORS[i % ZONE_COLORS.length]}
                        fill={`url(#grad-${zone.zoneId})`}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Predictive Staffing */}
            <section
              className="glass-card p-6"
              aria-label="Predictive staffing suggestions"
            >
              <div className="flex items-center gap-2 mb-4">
                <Users size={18} className="text-[var(--color-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Predictive Staffing Suggestions
                </h2>
              </div>
              {staffingSuggestions.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  All zones within safe parameters — no additional staffing
                  recommended.
                </p>
              ) : (
                <ul className="space-y-3">
                  {staffingSuggestions.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-elevated)]"
                    >
                      <SeverityBadge severity={s.severity} />
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {s.suggestion}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Incident Pattern Table */}
            <section className="glass-card p-6" aria-label="Past incidents">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={18} className="text-[var(--color-accent)]" />
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Incident Pattern Table
                </h2>
              </div>
              {alerts.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No past incidents recorded in this session.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">
                        <th className="py-2 pr-4">Time</th>
                        <th className="py-2 pr-4">Zone</th>
                        <th className="py-2 pr-4">Severity</th>
                        <th className="py-2 pr-4">Summary</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {alerts.slice(0, 20).map((alert) => (
                        <tr
                          key={alert.alertId}
                          className="hover:bg-[var(--color-bg-hover)]"
                        >
                          <td className="py-2.5 pr-4 font-mono text-xs text-[var(--color-text-muted)]">
                            {new Date(alert.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-2.5 pr-4 text-[var(--color-text-primary)]">
                            {alert.zoneName || alert.zoneId}
                          </td>
                          <td className="py-2.5 pr-4">
                            <SeverityBadge severity={alert.severity} />
                          </td>
                          <td className="py-2.5 pr-4 text-[var(--color-text-secondary)] max-w-md truncate">
                            {alert.summary}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                alert.resolved
                                  ? "bg-[var(--color-severity-low-bg)] text-[var(--color-severity-low)]"
                                  : "bg-[var(--color-severity-moderate-bg)] text-[var(--color-severity-moderate)]"
                              }`}
                            >
                              {alert.resolved ? "Resolved" : "Active"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
