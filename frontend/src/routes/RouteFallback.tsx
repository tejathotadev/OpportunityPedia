/** Shown while a split route chunk is in flight. */
export function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <span className="label-meta">Loading</span>
    </div>
  )
}
