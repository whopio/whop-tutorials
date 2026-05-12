"use client";

interface AudioPlayerProps {
  src: string;
  title: string;
  artist: string;
  isPreview?: boolean;
}

export function AudioPlayer({ src, title, artist, isPreview }: AudioPlayerProps) {
  return (
    <div
      className="mt-3 rounded-xl p-4"
      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="#7c3aed" viewBox="0 0 24 24">
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        </svg>
        <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
          <span className="font-medium text-white">{title}</span>
          <span> — {artist}</span>
          {isPreview && (
            <span
              className="ml-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}
            >
              PREVIEW
            </span>
          )}
        </p>
      </div>
      <audio
        controls
        src={src}
        className="w-full h-9"
        style={{ colorScheme: "dark" }}
      />
    </div>
  );
}
