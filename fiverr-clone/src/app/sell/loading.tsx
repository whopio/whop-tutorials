export default function SellLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-label="Loading">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--border)]" style={{ borderTopColor: 'var(--primary)' }} />
    </div>
  );
}
