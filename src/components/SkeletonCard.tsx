export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border-default bg-white p-5">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-surface-secondary" />
        <div className="h-3 w-16 rounded bg-surface-secondary" />
      </div>
      <div className="mt-3 h-5 w-3/4 rounded bg-surface-secondary" />
      <div className="mt-2 h-3 w-1/2 rounded bg-surface-secondary" />
      <div className="mt-3 flex gap-1.5">
        <div className="h-5 w-20 rounded-full bg-surface-secondary" />
        <div className="h-5 w-24 rounded-full bg-surface-secondary" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-surface-secondary" />
        <div className="h-3 w-2/3 rounded bg-surface-secondary" />
      </div>
      <div className="mt-4 h-9 w-full rounded-lg bg-surface-secondary" />
    </div>
  );
}
