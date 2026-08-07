/**
 * AnalyticsSkeleton — neutral pulse placeholders matching the real
 * view's layout so the operator sees the same shape filling in
 * instead of jumping from "blank" to "populated".
 *
 * Uses the project-wide `animate-pulse` Tailwind convention already
 * present in the dashboard loading surface.
 */

export interface AnalyticsSkeletonProps {
  /** Optional aria-label override for tests. */
  ariaLabel?: string;
}

function Pulse({ className = '' }: { className?: string }) {
  return <div className={`bg-muted rounded animate-pulse ${className}`} />;
}

export function AnalyticsSkeleton({ ariaLabel = 'Caricamento analytics…' }: AnalyticsSkeletonProps) {
  return (
    <div role="status" aria-busy="true" aria-label={ariaLabel} className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-start gap-4 border-b pb-4">
        <Pulse className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Pulse className="h-5 w-48" />
          <Pulse className="h-3 w-72" />
        </div>
        <Pulse className="h-8 w-24 rounded" />
        <Pulse className="h-8 w-24 rounded" />
      </div>
      {/* KPI grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={`k1-${i}`} className="border rounded-lg p-3 space-y-2">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-6 w-32" />
            <Pulse className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={`k2-${i}`} className="border rounded-lg p-3 space-y-2">
            <Pulse className="h-3 w-20" />
            <Pulse className="h-6 w-32" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex gap-1">
          {Array.from({ length: 4 }, (_, i) => (
            <Pulse key={`m-${i}`} className="h-6 w-20 rounded" />
          ))}
        </div>
        <Pulse className="h-48 w-full" />
      </div>
      {/* Table skeleton */}
      <div className="border rounded-lg p-4 space-y-2">
        <Pulse className="h-6 w-40" />
        {Array.from({ length: 4 }, (_, i) => (
          <Pulse key={`r-${i}`} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export default AnalyticsSkeleton;
