/**
 * Reasoning output types — mirrors backend ReasoningOutput exactly.
 * multilingual_alerts is Record<string, string> — dynamic, NOT fixed keys.
 */

export type AlertSeverity = "low" | "moderate" | "high" | "critical";

export interface ReasoningOutput {
  zoneId: string;
  severity: AlertSeverity;
  recommendation: string;
  reasoning: string;
  suggestedActions: string[];
  /** Dynamic map: language code → alert text. Keys driven by zone's languagesPresent. */
  multilingualAlerts: Record<string, string>;
  confidence: number;
}

export interface ReasoningInput {
  zoneId: string;
  zoneName: string;
  crowdDensity: number;
  crowdDensityTrend: number[];
  heatIndex: number;
  heatIndexTrend: number[];
  entryRate: number;
  capacity: number;
  currentOccupancy: number;
  hasShade: boolean;
  hasHydrationPoint: boolean;
  languagesPresent: string[];
  timeToEvent: string;
}
