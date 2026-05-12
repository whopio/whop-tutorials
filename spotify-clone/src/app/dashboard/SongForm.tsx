"use client";

import { useActionState, useRef, useState } from "react";
import { uploadSong, type SongFormState } from "@/app/actions/songs";

const initialState: SongFormState = {};

const inputStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#fff",
};

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) throw new Error(`Empty response (status ${res.status})`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response: ${text.slice(0, 100)}`);
  }
}

async function uploadToSupabase(file: File, bucket: string): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, filename: file.name, contentType: file.type }),
  });

  const json = await parseJsonSafe(res) as Record<string, string>;
  if (!res.ok) throw new Error(json.error ?? `Failed to get upload URL (${res.status})`);

  const { signedUrl, publicUrl } = json;
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    const detail = await uploadRes.text().catch(() => "");
    throw new Error(`File upload failed (${uploadRes.status})${detail ? `: ${detail.slice(0, 100)}` : ""}`);
  }

  return publicUrl;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-1.5">
        {label}
        {required && <span className="ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

export function SongForm() {
  const [state, action, pending] = useActionState(uploadSong, initialState);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isLoading = pending || uploading;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);

    const form = e.currentTarget;
    const audioInput = form.elements.namedItem("audioFile") as HTMLInputElement;
    const coverInput = form.elements.namedItem("coverFile") as HTMLInputElement;
    const audioFile = audioInput.files?.[0];
    if (!audioFile) { setUploadError("Audio file required"); return; }

    setUploading(true);
    try {
      const [audioUrl, coverUrl] = await Promise.all([
        uploadToSupabase(audioFile, "songs"),
        coverInput.files?.[0] ? uploadToSupabase(coverInput.files[0], "covers") : Promise.resolve(""),
      ]);

      const formData = new FormData(form);
      formData.set("audioUrl", audioUrl);
      formData.set("coverUrl", coverUrl);
      formData.delete("audioFile");
      formData.delete("coverFile");

      setUploading(false);
      action(formData);
    } catch (err) {
      setUploading(false);
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title" required error={state.errors?.title?.[0]}>
          <input
            name="title"
            type="text"
            placeholder="Song title"
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </Field>

        <Field label="Price" error={state.errors?.price?.[0]}>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <span
              className="flex items-center px-3 text-sm border-r select-none"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,255,255,0.1)" }}
            >
              $
            </span>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0.99"
              max="50"
              defaultValue="1.99"
              className="flex-1 px-3 py-2.5 text-sm outline-none"
              style={{ background: "transparent", color: "#fff" }}
            />
          </div>
        </Field>
      </div>

      <Field label="Description">
        <textarea
          name="description"
          rows={2}
          placeholder="Optional description"
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none"
          style={inputStyle}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Audio file" required error={state.errors?.audioFile?.[0]}>
          <input
            name="audioFile"
            type="file"
            accept="audio/*"
            className="w-full text-sm cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#7c3aed] file:text-white hover:file:opacity-90"
            style={{ color: "rgba(255,255,255,0.4)" }}
          />
        </Field>

        <Field label="Cover image">
          <input
            name="coverFile"
            type="file"
            accept="image/*"
            className="w-full text-sm cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold hover:file:opacity-90"
            style={{
              color: "rgba(255,255,255,0.4)",
            }}
          />
        </Field>
      </div>

      <div className="flex items-center gap-2.5">
        <input
          name="isFree"
          type="checkbox"
          id="isFree"
          className="w-4 h-4 rounded"
          style={{ accentColor: "#7c3aed" }}
        />
        <label htmlFor="isFree" className="text-sm font-medium text-white cursor-pointer">
          Mark as Free
        </label>
      </div>

      {(uploadError || state.message) && (
        <p className="text-sm text-red-400">{uploadError ?? state.message}</p>
      )}
      {state.success && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Song uploaded successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all disabled:opacity-50"
        style={{ background: "#7c3aed" }}
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {uploading ? "Uploading files…" : "Saving…"}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Song
          </>
        )}
      </button>
    </form>
  );
}
