/**
 * Zone data types — mirrors backend Pydantic models exactly.
 * No `any` types anywhere.
 */

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface ZoneTrend {
  timestamp: string;
  crowdDensity: number;
  heatIndex: number;
  entryRate: number;
}

export interface ZoneData {
  zoneId: string;
  zoneName: string;
  crowdDensity: number;
  heatIndex: number;
  entryRate: number;
  riskLevel: RiskLevel;
  capacity: number;
  currentOccupancy: number;
  hasShade: boolean;
  hasHydrationPoint: boolean;
  languagesPresent: string[];
  lastUpdated: string;
}

export interface ZoneHistory {
  zoneId: string;
  trends: ZoneTrend[];
  windowMinutes: number;
}

export interface ZoneDetail {
  zone: ZoneData;
  history: ZoneHistory;
  latestRecommendation: ReasoningOutput | null;
}

// Re-export reasoning type for convenience
import type { ReasoningOutput } from "./reasoning";
export type { ReasoningOutput };
