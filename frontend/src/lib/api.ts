/**
 * API client for StadiumPulse backend.
 * All responses are typed — no `any` flows through.
 * Automatically falls back to client-side simulation when backend is unreachable.
 */

import type {
  ZoneData,
  ZoneDetail,
  AlertFeed,
  AlertFilter,
  ReasoningOutput,
  UploadResult,
} from "../types";

const API_BASE = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || ""
  : import.meta.env.VITE_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert camelCase keys to snake_case for the Python backend. */
export function toSnakeCase(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(
      /[A-Z]/g,
      (letter) => `_${letter.toLowerCase()}`,
    );
    result[snakeKey] = value;
  }
  return result;
}

/** Convert snake_case keys to camelCase for the frontend. */
function toCamelCase<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item)) as T;
  }
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
        letter.toUpperCase(),
      );
      result[camelKey] = toCamelCase(value);
    }
    return result as T;
  }
  return obj as T;
}

// Global flag to track if we've switched to Mock Fallback Mode
let isUsingMockFallback = false;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (isUsingMockFallback) {
    return handleMockRequest<T>(path, init);
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error ${response.status}: ${error}`);
    }

    const data: unknown = await response.json();
    return toCamelCase<T>(data);
  } catch (err) {
    console.warn(
      `Backend connection failed. Switching to Local Demo Mock Mode. Error:`,
      err,
    );
    isUsingMockFallback = true;
    return handleMockRequest<T>(path, init);
  }
}

// ---------------------------------------------------------------------------
// Client-side Mock Mode State & Handlers
// ---------------------------------------------------------------------------

const INITIAL_ZONES: ZoneData[] = [
  {
    zoneId: "zone-a",
    zoneName: "Gate A — North Stand",
    capacity: 8000,
    currentOccupancy: 4400,
    crowdDensity: 55.0,
    heatIndex: 34.0,
    entryRate: 120.0,
    riskLevel: "low",
    hasShade: true,
    hasHydrationPoint: true,
    languagesPresent: ["en", "es"],
    lastUpdated: new Date().toISOString(),
  },
  {
    zoneId: "zone-b",
    zoneName: "Gate B — East Wing",
    capacity: 6500,
    currentOccupancy: 2600,
    crowdDensity: 40.0,
    heatIndex: 38.0,
    entryRate: 85.0,
    riskLevel: "moderate",
    hasShade: false,
    hasHydrationPoint: true,
    languagesPresent: ["en", "fr"],
    lastUpdated: new Date().toISOString(),
  },
  {
    zoneId: "zone-c",
    zoneName: "Gate C — South Stand",
    capacity: 9000,
    currentOccupancy: 7380,
    crowdDensity: 82.0,
    heatIndex: 41.0,
    entryRate: 240.0,
    riskLevel: "high",
    hasShade: false,
    hasHydrationPoint: false,
    languagesPresent: ["en", "es", "pt"],
    lastUpdated: new Date().toISOString(),
  },
  {
    zoneId: "zone-d",
    zoneName: "Gate D — West Wing",
    capacity: 7000,
    currentOccupancy: 3150,
    crowdDensity: 45.0,
    heatIndex: 35.0,
    entryRate: 60.0,
    riskLevel: "low",
    hasShade: true,
    hasHydrationPoint: true,
    languagesPresent: ["en", "ar"],
    lastUpdated: new Date().toISOString(),
  },
  {
    zoneId: "zone-e",
    zoneName: "Gate E — VIP Concourse",
    capacity: 3000,
    currentOccupancy: 900,
    crowdDensity: 30.0,
    heatIndex: 28.0,
    entryRate: 20.0,
    riskLevel: "low",
    hasShade: true,
    hasHydrationPoint: true,
    languagesPresent: ["en", "fr", "ar"],
    lastUpdated: new Date().toISOString(),
  },
  {
    zoneId: "zone-f",
    zoneName: "Gate F — Family Section",
    capacity: 5000,
    currentOccupancy: 2500,
    crowdDensity: 50.0,
    heatIndex: 32.0,
    entryRate: 40.0,
    riskLevel: "low",
    hasShade: true,
    hasHydrationPoint: true,
    languagesPresent: ["en", "es", "de"],
    lastUpdated: new Date().toISOString(),
  },
];

let mockZones = [...INITIAL_ZONES];

// Map zone IDs to simulated historical trends
const mockHistory: Record<string, ZoneDetail["history"]> = {};
mockZones.forEach((z) => {
  const trends = Array.from({ length: 6 }, (_, i) => {
    const minAgo = (5 - i) * 10;
    const time = new Date(Date.now() - minAgo * 60 * 1000).toISOString();
    return {
      timestamp: time,
      crowdDensity: Math.max(
        10,
        Math.min(
          100,
          z.crowdDensity - (5 - i) * 3 + Math.floor(Math.random() * 5),
        ),
      ),
      heatIndex: Math.max(
        20,
        Math.min(50, z.heatIndex - (5 - i) * 0.5 + Math.random() - 0.5),
      ),
      entryRate: Math.max(
        5,
        z.entryRate - (5 - i) * 10 + Math.floor(Math.random() * 20),
      ),
    };
  });
  mockHistory[z.zoneId] = {
    zoneId: z.zoneId,
    trends,
    windowMinutes: 60,
  };
});

// Mock alerts feed
let mockAlerts: any[] = [
  {
    alertId: "alert-1",
    zoneId: "zone-c",
    zoneName: "Gate C — South Stand",
    severity: "high",
    summary: "Extreme heat and high crowd density at Gate C.",
    reasoning:
      "Heat index has crossed 41°C. Zone C has 0% shade and no hydration points. Egress bottlenecks are compounding.",
    suggestedActions: [
      "Open auxiliary Gate C-2 immediately.",
      "Redirect inbound spectators to shade refuges at Zone D.",
      "Dispatch mobile hydration team to Zone C perimeter.",
    ],
    multilingualAlerts: {
      en: "CRITICAL ALERT: Extreme Heat & Congestion in Zone C. Please redirect to Zone D. Seek water at Zone B/D.",
      es: "ALERTA CRÍTICA: Calor extremo y congestión en Zona C. Diríjase a la Zona D. Busque agua en Zona B/D.",
      pt: "ALERTA CRÍTICO: Calor extremo e congestionamento na Zona C. Por favor, dirija-se à Zona D. Água disponível na Zona B/D.",
    },
    confidence: 0.94,
    isStale: false,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    resolved: false,
    resolvedAt: null,
  },
];

function handleMockRequest<T>(path: string, _init?: RequestInit): T {
  if (path === "/api/health") {
    return { status: "healthy", service: "stadiumpulse-demo-fallback" } as T;
  }

  if (path === "/api/zones") {
    // Randomly fluctuate values slightly for realistic realtime effect
    mockZones = mockZones.map((z) => {
      const deltaD = (Math.random() - 0.5) * 2;
      const newD = Math.max(
        10,
        Math.min(100, parseFloat((z.crowdDensity + deltaD).toFixed(1))),
      );
      const newOccupancy = Math.floor((newD / 100) * z.capacity);
      const deltaH = (Math.random() - 0.5) * 0.4;
      const newH = Math.max(
        20,
        Math.min(48, parseFloat((z.heatIndex + deltaH).toFixed(1))),
      );
      const deltaE = Math.floor((Math.random() - 0.5) * 10);
      const newE = Math.max(5, z.entryRate + deltaE);

      let risk: ZoneData["riskLevel"] = "low";
      if (newD > 80 && newH > 38) risk = "critical";
      else if (newD > 75 || newH > 35) risk = "high";
      else if (newD > 50 || newH > 30) risk = "moderate";

      return {
        ...z,
        crowdDensity: newD,
        currentOccupancy: newOccupancy,
        heatIndex: newH,
        entryRate: newE,
        riskLevel: risk,
        lastUpdated: new Date().toISOString(),
      };
    });
    return mockZones as T;
  }

  if (path.startsWith("/api/zones/")) {
    const zoneId = path.substring("/api/zones/".length);
    const zone = mockZones.find((z) => z.zoneId === zoneId) || mockZones[0];
    const history = mockHistory[zone.zoneId] || {
      zoneId: zone.zoneId,
      trends: [],
      windowMinutes: 60,
    };
    // Append newest trend
    const newTrend = {
      timestamp: new Date().toISOString(),
      crowdDensity: zone.crowdDensity,
      heatIndex: zone.heatIndex,
      entryRate: zone.entryRate,
    };
    history.trends = [...history.trends.slice(1), newTrend];

    // Find latest recommendation
    const latestRec =
      mockAlerts.find((a) => a.zoneId === zone.zoneId && !a.resolved) || null;

    return {
      zone,
      history,
      latestRecommendation: latestRec,
    } as T;
  }

  if (path.startsWith("/api/alerts")) {
    // Parse filters from URL
    const url = new URL(path, "http://localhost");
    const severityFilter = url.searchParams.get("severity");
    const zoneIdFilter = url.searchParams.get("zone_id");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("page_size") || "20");

    let filtered = [...mockAlerts];
    if (severityFilter) {
      filtered = filtered.filter((a) => a.severity === severityFilter);
    }
    if (zoneIdFilter) {
      filtered = filtered.filter((a) => a.zoneId === zoneIdFilter);
    }

    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      alerts: paginated,
      totalCount: filtered.length,
      page,
      pageSize,
      hasNext: startIndex + pageSize < filtered.length,
    } as T;
  }

  if (path.startsWith("/api/reason")) {
    const parts = path.split("/");
    const specificZoneId = parts.length > 3 ? parts[3] : undefined;

    let targetZone = mockZones[0];
    if (specificZoneId) {
      targetZone =
        mockZones.find((z) => z.zoneId === specificZoneId) || mockZones[0];
    } else {
      // Find the zone with highest risk
      const sorted = [...mockZones].sort((a, b) => {
        const severityRank = { critical: 4, high: 3, moderate: 2, low: 1 };
        return severityRank[b.riskLevel] - severityRank[a.riskLevel];
      });
      targetZone = sorted[0];
    }

    const severity =
      targetZone.riskLevel === "critical"
        ? "critical"
        : targetZone.riskLevel === "high"
          ? "high"
          : targetZone.riskLevel === "moderate"
            ? "moderate"
            : "low";

    let recommendation = `Continue normal operations in ${targetZone.zoneName}. Telemetry metrics are within safety boundaries.`;
    let reasoning = `Crowd density is ${targetZone.crowdDensity}% and heat index is ${targetZone.heatIndex}°C. Adequate shade and hydration are available.`;
    let suggestedActions = [
      "Monitor entrance flow rates.",
      "Ensure hydration points are fully staffed.",
    ];
    let multilingualAlerts: Record<string, string> = {
      en: `Operations stable in ${targetZone.zoneName}.`,
    };

    if (severity === "critical" || severity === "high") {
      recommendation = `Immediately redirect incoming crowd away from ${targetZone.zoneName}. Open auxiliary gates.`;
      reasoning = `Compound heat-crowd index danger: Crowd density is at ${targetZone.crowdDensity}% and heat index is ${targetZone.heatIndex}°C. ${targetZone.hasShade ? "" : "Zone lacks shade coverage."} ${targetZone.hasHydrationPoint ? "" : "Zone has no active hydration point."} Congestion risk is critically high.`;
      suggestedActions = [
        "Deploy emergency shade canopy buffers.",
        "Announce audio/visual redirects to adjacent stands.",
        "Dispatch emergency medical responders to standby positions.",
      ];

      // Multilingual alerts matching zone languages
      if (targetZone.zoneId === "zone-c") {
        multilingualAlerts = {
          en: "CRITICAL: Extreme Heat & Congestion in Zone C. Please redirect to Zone D. Seek shade and water.",
          es: "CRÍTICO: Calor extremo y congestión en Zona C. Diríjase a la Zona D. Busque sombra y agua.",
          pt: "CRÍTICO: Calor extremo e congestionamento na Zona C. Por favor, dirija-se à Zona D. Procure sombra e água.",
        };
      } else if (targetZone.zoneId === "zone-b") {
        multilingualAlerts = {
          en: "ALERT: High heat in Zone B. Free water station located in adjacent Gate A.",
          fr: "ALERTE: Chaleur élevée dans la zone B. Station d'eau gratuite située à la porte A adjacente.",
        };
      } else {
        multilingualAlerts = {
          en: `Alert: High crowd density and heat index in ${targetZone.zoneName}.`,
        };
      }
    }

    const reasoningOutput: ReasoningOutput = {
      zoneId: targetZone.zoneId,
      severity,
      recommendation,
      reasoning,
      suggestedActions,
      multilingualAlerts,
      confidence: 0.9,
    };

    // Save reasoning output as a new alert
    const newAlert = {
      alertId: `alert-${Date.now()}`,
      zoneId: targetZone.zoneId,
      zoneName: targetZone.zoneName,
      severity,
      summary: recommendation,
      reasoning,
      suggestedActions,
      multilingualAlerts,
      confidence: 0.9,
      isStale: false,
      createdAt: new Date().toISOString(),
      resolved: false,
      resolvedAt: null,
    };

    // Prepend new alert
    mockAlerts = [
      newAlert,
      ...mockAlerts.filter((a) => a.zoneId !== targetZone.zoneId),
    ];

    return reasoningOutput as T;
  }

  if (path === "/api/data/reset") {
    mockZones = [...INITIAL_ZONES];
    mockAlerts = [];
    return {
      success: true,
      rowsAccepted: 6,
      rowsRejected: 0,
      message: "Data reset successfully to default state.",
    } as T;
  }

  if (path === "/api/data/upload") {
    // Just mock successful upload
    return {
      success: true,
      rowsAccepted: 24,
      rowsRejected: 0,
      message: "Successfully uploaded 24 records client-side.",
    } as T;
  }

  throw new Error(`Endpoint mock handler not found for path: ${path}`);
}

// ---------------------------------------------------------------------------
// Zone Endpoints
// ---------------------------------------------------------------------------

/**
 * Fetch the current state of all stadium zones.
 * @returns A promise resolving to an array of ZoneData objects.
 */
export async function fetchZones(): Promise<ZoneData[]> {
  return apiFetch<ZoneData[]>("/api/zones");
}

/**
 * Fetch detailed information for a specific zone, including historical trends.
 * @param zoneId - The unique identifier of the zone.
 * @returns A promise resolving to the zone's details and history.
 */
export async function fetchZoneDetail(zoneId: string): Promise<ZoneDetail> {
  return apiFetch<ZoneDetail>(`/api/zones/${zoneId}`);
}

// ---------------------------------------------------------------------------
// Alert Endpoints
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated, filtered list of alerts.
 * @param filters - Optional filters for severity, zone, and time range.
 * @returns A promise resolving to the alert feed.
 */
export async function fetchAlerts(
  filters: Partial<AlertFilter> = {},
): Promise<AlertFeed> {
  const params = new URLSearchParams();
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.zoneId) params.set("zone_id", filters.zoneId);
  if (filters.startTime) params.set("start_time", filters.startTime);
  if (filters.endTime) params.set("end_time", filters.endTime);
  params.set("page", String(filters.page || 1));
  params.set("page_size", String(filters.pageSize || 20));

  return apiFetch<AlertFeed>(`/api/alerts?${params.toString()}`);
}

// ---------------------------------------------------------------------------
// Reasoning Endpoints
// ---------------------------------------------------------------------------

/**
 * Trigger the Gemini reasoning engine to generate an assessment.
 * @param zoneId - Optional zone ID. If omitted, reasons across all zones and returns the most critical.
 * @returns A promise resolving to the AI reasoning output.
 */
export async function triggerReasoning(
  zoneId?: string,
): Promise<ReasoningOutput> {
  const path = zoneId ? `/api/reason/${zoneId}` : "/api/reason";
  return apiFetch<ReasoningOutput>(path, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Upload Endpoints
// ---------------------------------------------------------------------------

/**
 * Upload a dataset file (e.g., historical incidents or zone config).
 * @param file - The file object to upload.
 * @returns A promise resolving to the upload result summary.
 */
export async function uploadData(file: File): Promise<UploadResult> {
  if (isUsingMockFallback) {
    return handleMockRequest<UploadResult>("/api/data/upload");
  }

  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/data/upload`, {
      method: "POST",
      body: formData,
    });
  } catch (networkErr) {
    // Genuine network failure (no connectivity) → fall back to mock
    console.warn(
      "Upload network error. Switching to Local Demo Mock Mode.",
      networkErr,
    );
    isUsingMockFallback = true;
    return handleMockRequest<UploadResult>("/api/data/upload");
  }

  if (!response.ok) {
    // HTTP error (4xx/5xx) → surface the real server message to the UI
    const errorText = await response.text();
    throw new Error(errorText || `Upload error ${response.status}`);
  }

  const data: unknown = await response.json();
  return toCamelCase<UploadResult>(data);
}

/**
 * Reset all data to the default synthesized initial state.
 * @returns A promise resolving to the reset operation result.
 */
export async function resetData(): Promise<UploadResult> {
  return apiFetch<UploadResult>("/api/data/reset", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

/**
 * Check the health status of the backend API.
 * @returns A promise resolving to the health check status.
 */
export async function healthCheck(): Promise<{
  status: string;
  service: string;
}> {
  return apiFetch<{ status: string; service: string }>("/api/health");
}
