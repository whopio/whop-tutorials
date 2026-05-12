import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6" style={{ colorScheme: "light" }}>
      <div className="text-center max-w-sm">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(124,58,237,0.08)" }}
        >
          <svg className="w-8 h-8 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1
          className="text-4xl font-extrabold tracking-tight text-black mb-2"
          style={{ fontFamily: "var(--font-bricolage)" }}
        >
          404
        </h1>
        <p className="text-gray-500 mb-8">This artist page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #9f67fa 100%)",
            boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Soundify
        </Link>
      </div>
    </div>
  );
}
