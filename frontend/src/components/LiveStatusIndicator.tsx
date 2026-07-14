/**
 * Live status indicator — shows Firestore connection health.
 */

interface LiveStatusProps {
  status: "live" | "syncing" | "stale";
}

const STATUS_CONFIG = {
  live: {
    label: "Live",
    dotClass: "bg-[var(--color-severity-low)]",
    pulse: true,
  },
  syncing: {
    label: "Syncing",
    dotClass: "bg-[var(--color-severity-moderate)]",
    pulse: true,
  },
  stale: {
    label: "Data stale",
    dotClass: "bg-[var(--color-severity-high)]",
    pulse: false,
  },
} as const;

export function LiveStatusIndicator({ status }: LiveStatusProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)]"
      role="status"
      aria-label={`Connection status: ${config.label}`}
    >
      <span className="relative flex h-2.5 w-2.5">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.dotClass} opacity-75 animate-ping`}
            aria-hidden="true"
          />
        )}
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${config.dotClass}`}
          aria-hidden="true"
        />
      </span>
      <span className="text-xs font-medium text-[var(--color-text-secondary)]">
        {config.label}
      </span>
    </div>
  );
}
