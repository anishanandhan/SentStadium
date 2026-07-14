/**
 * SVG stadium zone map — interactive, color-coded by risk level.
 * Each zone is keyboard-focusable and click/enter activates the detail drawer.
 */

import type { ZoneData, RiskLevel } from "@/types";

interface ZoneMapProps {
  zones: ZoneData[];
  selectedZoneId: string | null;
  onZoneSelect: (zoneId: string) => void;
}

// Stadium layout — hexagonal zone arrangement
const ZONE_POSITIONS: Record<string, { cx: number; cy: number; rx: number; ry: number; label: { x: number; y: number } }> = {
  "zone-a": { cx: 300, cy: 80, rx: 120, ry: 55, label: { x: 300, y: 80 } },
  "zone-b": { cx: 520, cy: 200, rx: 80, ry: 90, label: { x: 520, y: 200 } },
  "zone-c": { cx: 300, cy: 340, rx: 120, ry: 55, label: { x: 300, y: 340 } },
  "zone-d": { cx: 80, cy: 200, rx: 80, ry: 90, label: { x: 80, y: 200 } },
  "zone-e": { cx: 480, cy: 80, rx: 60, ry: 45, label: { x: 480, y: 80 } },
  "zone-f": { cx: 120, cy: 340, rx: 70, ry: 45, label: { x: 120, y: 340 } },
};

const RISK_CLASS: Record<RiskLevel, string> = {
  low: "zone--low",
  moderate: "zone--moderate",
  high: "zone--high",
  critical: "zone--critical",
};

export function ZoneMap({ zones, selectedZoneId, onZoneSelect }: ZoneMapProps) {
  const zonesMap = new Map(zones.map((z) => [z.zoneId, z]));

  return (
    <div className="relative w-full" role="group" aria-label="Interactive stadium zones container">
      <svg
        viewBox="0 0 600 420"
        className="w-full h-auto"
        role="group"
        aria-label="Interactive stadium zones"
      >
        {/* Stadium outline */}
        <rect
          x="10"
          y="10"
          width="580"
          height="400"
          rx="40"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="2"
          strokeDasharray="8 4"
        />

        {/* Field center */}
        <ellipse
          cx="300"
          cy="210"
          rx="80"
          ry="50"
          fill="var(--color-severity-low)"
          fillOpacity="0.05"
          stroke="var(--color-border)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <text
          x="300"
          y="215"
          textAnchor="middle"
          fill="var(--color-text-muted)"
          fontSize="11"
          fontFamily="var(--font-family-body)"
        >
          PITCH
        </text>

        {/* Zone regions */}
        {Object.entries(ZONE_POSITIONS).map(([zoneId, pos]) => {
          const zone = zonesMap.get(zoneId);
          const riskClass = zone ? RISK_CLASS[zone.riskLevel] : "zone--low";
          const isSelected = selectedZoneId === zoneId;
          const isCritical = zone?.riskLevel === "critical";

          return (
            <g key={zoneId}>
              <ellipse
                cx={pos.cx}
                cy={pos.cy}
                rx={pos.rx}
                ry={pos.ry}
                className={`zone-region ${riskClass} ${isCritical ? "animate-pulse-critical" : ""}`}
                strokeWidth={isSelected ? 3 : 2}
                onClick={() => onZoneSelect(zoneId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onZoneSelect(zoneId);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${zone?.zoneName || zoneId}: ${zone ? `${zone.crowdDensity}% density, ${zone.heatIndex}°C, risk ${zone.riskLevel}` : "loading"}`}
                aria-pressed={isSelected}
                style={{
                  filter: isSelected ? "brightness(1.3)" : undefined,
                }}
              />

              {/* Zone label */}
              <text
                x={pos.label.x}
                y={pos.label.y - 10}
                textAnchor="middle"
                fill="var(--color-text-primary)"
                fontSize="12"
                fontWeight="600"
                fontFamily="var(--font-family-display)"
                pointerEvents="none"
              >
                {zone?.zoneName.split("—")[0].trim() || zoneId}
              </text>

              {/* Density & heat readout */}
              {zone && (
                <text
                  x={pos.label.x}
                  y={pos.label.y + 8}
                  textAnchor="middle"
                  fill="var(--color-text-secondary)"
                  fontSize="10"
                  fontFamily="var(--font-family-mono)"
                  pointerEvents="none"
                >
                  {zone.crowdDensity.toFixed(0)}% · {zone.heatIndex.toFixed(0)}°C
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
