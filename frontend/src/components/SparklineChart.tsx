/**
 * Sparkline chart — small trend visualization using Recharts.
 */

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

interface SparklineChartProps {
  data: Array<{ value: number; timestamp?: string }>;
  color?: string;
  height?: number;
  label: string; // Accessible label
}

export function SparklineChart({
  data,
  color = "var(--color-accent)",
  height = 40,
  label,
}: SparklineChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-[var(--color-text-muted)]"
        style={{ height }}
        role="img"
        aria-label={`${label}: No data available`}
      >
        No trend data
      </div>
    );
  }

  return (
    <div role="img" aria-label={`${label} trend chart`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{
              background: "var(--color-bg-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.75rem",
              color: "var(--color-text-primary)",
            }}
            formatter={(value: any) => [Number(value).toFixed(1), label]}
            labelFormatter={() => ""}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${label})`}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
