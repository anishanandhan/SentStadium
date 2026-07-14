/**
 * Severity badge — always uses color + text + icon (never color alone).
 * WCAG compliant: information conveyed by color is also conveyed by text and icon.
 */

import { AlertTriangle, CheckCircle, AlertOctagon, Info } from "lucide-react";
import type { AlertSeverity } from "@/types";

interface SeverityBadgeProps {
  severity: AlertSeverity;
  className?: string;
}

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; icon: typeof CheckCircle }> = {
  low: { label: "Low", icon: CheckCircle },
  moderate: { label: "Moderate", icon: Info },
  high: { label: "High", icon: AlertTriangle },
  critical: { label: "Critical", icon: AlertOctagon },
};

export function SeverityBadge({ severity, className = "" }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <span
      className={`severity-badge severity-badge--${severity} ${className}`}
      role="status"
      aria-label={`Severity: ${config.label}`}
    >
      <Icon size={14} aria-hidden="true" />
      {config.label}
    </span>
  );
}
