"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Upload, Video } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  order: number;
  isFree: boolean;
  videoReady: boolean;
  muxUploadId: string | null;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export function CourseEditor({
  courseId,
  sections,
  status,
}: {
  courseId: string;
  sections: Section[];
  status: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadLessonRef = useRef<string | null>(null);
  const [addingSectionTitle, setAddingSectionTitle] = useState("");
  const [showAddSection, setShowAddSection] = useState(false);
  const [addingLessonFor, setAddingLessonFor] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [newLessonFree, setNewLessonFree] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addSection() {
    if (!addingSectionTitle.trim() || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/teach/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title: addingSectionTitle.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add section");
      setBusy(false);
      return;
    }
    setAddingSectionTitle("");
    setShowAddSection(false);
    setBusy(false);
    router.refresh();
  }

  async function deleteSection(sectionId: string) {
    if (busy) return;
    setBusy(true);
    await fetch("/api/teach/sections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sectionId }),
    });
    setBusy(false);
    router.refresh();
  }

  async function addLesson(sectionId: string) {
    if (!newLessonTitle.trim() || busy) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/teach/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sectionId,
        title: newLessonTitle.trim(),
        isFree: newLessonFree,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add lesson");
      setBusy(false);
      return;
    }
    setNewLessonTitle("");
    setNewLessonFree(false);
    setAddingLessonFor(null);
    setBusy(false);
    router.refresh();
  }

  async function deleteLesson(lessonId: string) {
    if (busy) return;
    setBusy(true);
    await fetch("/api/teach/lessons", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lessonId }),
    });
    setBusy(false);
    router.refresh();
  }

  function startUpload(lessonId: string) {
    setError("");
    pendingUploadLessonRef.current = lessonId;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const lessonId = pendingUploadLessonRef.current;
    if (!file || !lessonId) {
      pendingUploadLessonRef.current = null;
      return;
    }
    setUploadingFor(lessonId);

    setError("");
    setUploadProgress(0);

    try {
      // Get upload URL from our API
      const res = await fetch("/api/teach/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to start upload");
        setUploadingFor(null);
        setUploadProgress(null);
        return;
      }
      const { url } = await res.json();

      // Upload directly to Mux
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      setUploadProgress(100);
      // Brief "Upload complete" moment before switching to Processing
      setTimeout(() => {
        setUploadProgress(null);
        setUploadingFor(null);
        setUploadUrl(null);
        pendingUploadLessonRef.current = null;
        router.refresh();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadProgress(null);
      setUploadingFor(null);
    }
  }

  async function publish() {
    if (publishing) return;
    setPublishing(true);
    setError("");
    const res = await fetch(`/api/teach/courses/${courseId}/publish`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to publish");
      setPublishing(false);
      return;
    }
    setPublishing(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <div className="p-7 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold">Curriculum</h2>
          {status === "DRAFT" && (
            <button
              onClick={publish}
              disabled={publishing}
              className="px-5 py-2 rounded-lg bg-[var(--color-accent)] text-white text-sm font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {publishing ? "Publishing..." : "Publish Course"}
            </button>
          )}
        </div>

        {sections.length === 0 && !showAddSection && (
          <p className="text-sm text-[var(--color-text-secondary)] mb-5">
            No sections yet. Add your first section to start building the curriculum.
          </p>
        )}

        <div className="space-y-5">
          {sections.map((section) => (
            <div
              key={section.id}
              className="border border-[var(--color-border)] rounded-lg overflow-hidden"
            >
              <div className="px-5 py-3.5 bg-[var(--color-surface-elevated)] flex items-center justify-between">
                <span className="font-medium text-sm">{section.title}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {section.lessons.length} lessons
                  </span>
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-1 rounded hover:bg-[var(--color-error)]/10 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                    title="Delete section"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {section.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="px-5 py-3 border-t border-[var(--color-border)] text-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <Video className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                    <span>{lesson.title}</span>
                    {lesson.isFree && (
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--color-success)]/15 text-[var(--color-success)]">
                        Free
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md ${
                        lesson.videoReady
                          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                          : lesson.muxUploadId
                            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                            : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
                      }`}
                    >
                      {lesson.videoReady ? "Ready" : lesson.muxUploadId ? "Processing" : "No video"}
                    </span>
                    {!lesson.videoReady && uploadingFor !== lesson.id && (
                      <button
                        onClick={() => startUpload(lesson.id)}
                        className="p-1 rounded hover:bg-[var(--color-accent)]/10 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)]"
                        title="Upload video"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteLesson(lesson.id)}
                      className="p-1 rounded hover:bg-[var(--color-error)]/10 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                      title="Delete lesson"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {uploadingFor &&
                section.lessons.some((l) => l.id === uploadingFor) &&
                uploadProgress !== null && (
                  <div className="px-5 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                    <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] mb-2">
                      <span>Uploading video...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-accent)] rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

              {addingLessonFor === section.id ? (
                <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Lesson title"
                    value={newLessonTitle}
                    onChange={(e) => setNewLessonTitle(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && addLesson(section.id)
                    }
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
                    autoFocus
                  />
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={newLessonFree}
                      onChange={(e) => setNewLessonFree(e.target.checked)}
                      className="rounded"
                    />
                    Free
                  </label>
                  <button
                    onClick={() => addLesson(section.id)}
                    disabled={busy || !newLessonTitle.trim()}
                    className="px-3 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setAddingLessonFor(null);
                      setNewLessonTitle("");
                      setNewLessonFree(false);
                    }}
                    className="px-3 py-2 rounded-lg text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingLessonFor(section.id)}
                  className="w-full px-5 py-2.5 border-t border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-surface-elevated)] flex items-center gap-1.5 justify-center"
                >
                  <Plus className="w-3 h-3" /> Add Lesson
                </button>
              )}
            </div>
          ))}
        </div>

        {showAddSection ? (
          <div className="mt-5 flex items-center gap-3">
            <input
              type="text"
              placeholder="Section title"
              value={addingSectionTitle}
              onChange={(e) => setAddingSectionTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSection()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
              autoFocus
            />
            <button
              onClick={addSection}
              disabled={busy || !addingSectionTitle.trim()}
              className="px-4 py-2.5 rounded-lg bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddSection(false);
                setAddingSectionTitle("");
              }}
              className="px-4 py-2.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddSection(true)}
            className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] w-full justify-center"
          >
            <Plus className="w-4 h-4" /> Add Section
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelected}
      />
    </div>
  );
}
