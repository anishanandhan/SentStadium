/**
 * Skeleton loader — preserves layout, prevents content shift.
 * Animation respects prefers-reduced-motion via CSS.
 */

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: boolean;
}

export function Skeleton({
  width = "100%",
  height = "1rem",
  className = "",
  rounded = false,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded ? "!rounded-full" : ""} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
      role="presentation"
    />
  );
}

/** Card-shaped skeleton for loading states */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl bg-[var(--color-bg-elevated)] p-6 ${className}`}
    >
      <Skeleton width="40%" height="1.25rem" className="mb-3" />
      <Skeleton width="100%" height="0.875rem" className="mb-2" />
      <Skeleton width="75%" height="0.875rem" className="mb-4" />
      <Skeleton width="30%" height="2rem" rounded />
    </div>
  );
}
