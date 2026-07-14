/**
 * Alert types — mirrors backend Alert model.
 */

export type { AlertSeverity } from "./reasoning";

export interface Alert {
  alertId: string;
  zoneId: string;
  zoneName: string;
  severity: "low" | "moderate" | "high" | "critical";
  summary: string;
  reasoning: string;
  suggestedActions: string[];
  multilingualAlerts: Record<string, string>;
  confidence: number;
  isStale: boolean;
  createdAt: string;
  resolved: boolean;
  resolvedAt: string | null;
}

export interface AlertFilter {
  severity?: "low" | "moderate" | "high" | "critical";
  zoneId?: string;
  startTime?: string;
  endTime?: string;
  page: number;
  pageSize: number;
}

export interface AlertFeed {
  alerts: Alert[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}
