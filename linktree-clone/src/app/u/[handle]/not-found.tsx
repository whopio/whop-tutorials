export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col">
      <header className="border-b border-neutral-100 px-6 py-4">
        <a href="/" className="font-semibold tracking-tight text-sm">
          Linkstacks
        </a>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <p className="text-4xl font-semibold text-neutral-200 mb-4 tracking-tight">
          404
        </p>
        <p className="text-sm text-neutral-500 mb-6">
          This page doesn&apos;t exist.
        </p>
        <a
          href="/"
          className="text-sm font-semibold text-white rounded-lg px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 transition-colors"
        >
          Go home
        </a>
      </main>
    </div>
  );
}
