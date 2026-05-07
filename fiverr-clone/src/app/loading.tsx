export default function Loading() {
  return (
    <div
      className="flex min-h-[50vh] items-center justify-center"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]"
          style={{ borderTopColor: 'var(--primary)' }}
        />
        <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>
      </div>
    </div>
  );
}
