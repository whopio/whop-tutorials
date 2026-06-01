"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { storylineExtensions } from "@/lib/tiptap/extensions";
import { findPaywallNodePos } from "@/lib/tiptap/paywall-break-node";
import { EditorToolbar } from "./EditorToolbar";
import { CoverImagePicker } from "./CoverImagePicker";
import { PublishDialog } from "./PublishDialog";
import type { TopicOption } from "./TopicsPicker";

interface InitialStory {
  id: string;
  title: string;
  subtitle: string | null;
  contentJson: JSONContent;
  coverImageUrl: string | null;
  status: "DRAFT" | "PUBLISHED" | "UNLISTED";
  topicSlugs: string[];
}

interface Props {
  story: InitialStory;
  topicOptions: TopicOption[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function StoryEditor({ story, topicOptions }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(story.title);
  const [subtitle, setSubtitle] = useState(story.subtitle ?? "");
  const [coverUrl, setCoverUrl] = useState<string | null>(story.coverImageUrl);
  const [coverKey, setCoverKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showPublish, setShowPublish] = useState(false);
  // Seed from the initial document so the publish-dialog hint shows correctly
  // on first render; onUpdate keeps it fresh as the writer edits.
  const [hasPaywallBreak, setHasPaywallBreak] = useState(() =>
    findPaywallNodePos(story.contentJson as { content?: unknown[] } | null) !== null,
  );
  const pendingPayloadRef = useRef<Record<string, unknown> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: storylineExtensions,
    content: story.contentJson,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "tiptap-prose prose-storyline focus:outline-none min-h-[400px] font-serif text-[20px] leading-[32px] text-text-primary",
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON();
      let has = false;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "paywallBreak") has = true;
      });
      setHasPaywallBreak(has);
      queueSave({ contentJson: json });
    },
  });

  function queueSave(patch: Record<string, unknown>) {
    pendingPayloadRef.current = { ...(pendingPayloadRef.current ?? {}), ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(flushSave, 1500);
  }

  async function flushSave() {
    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = null;
    if (!payload) return;
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  // Flush on unload so unsaved keystrokes aren't lost on navigation.
  useEffect(() => {
    function onUnload() {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pendingPayloadRef.current && navigator.sendBeacon) {
        navigator.sendBeacon(
          `/api/stories/${story.id}`,
          new Blob([JSON.stringify(pendingPayloadRef.current)], {
            type: "application/json",
          }),
        );
        pendingPayloadRef.current = null;
      }
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [story.id]);

  function onTitleChange(value: string) {
    setTitle(value);
    queueSave({ title: value });
  }

  function onSubtitleChange(value: string) {
    setSubtitle(value);
    queueSave({ subtitle: value });
  }

  function onCoverChange(next: { url: string; key: string } | null) {
    setCoverUrl(next?.url ?? null);
    setCoverKey(next?.key ?? null);
    queueSave({ coverImageUrl: next?.url ?? null, coverImageKey: next?.key ?? null });
  }

  const saveLabel = useMemo(() => {
    switch (saveState) {
      case "saving":
        return "Saving…";
      case "saved":
        return "Saved";
      case "error":
        return "Save failed";
      default:
        return "Draft";
    }
  }, [saveState]);

  return (
    <>
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="mx-auto max-w-[680px] flex items-center justify-between px-4 sm:px-0 h-[57px]">
          <div className="text-sm text-text-secondary">
            {story.status === "PUBLISHED" ? "Editing published story" : "Draft"} ·{" "}
            <span className={saveState === "error" ? "text-error" : ""}>{saveLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/me/stories`)}
              className="px-3 py-1.5 rounded-pill text-sm text-text-secondary hover:text-text-primary"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => setShowPublish(true)}
              className="px-4 py-2 rounded-pill bg-brand text-white text-sm font-medium hover:bg-brand-hover"
            >
              {story.status === "PUBLISHED" ? "Update" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <EditorToolbar editor={editor} />

      <div className="mx-auto max-w-[680px] px-4 sm:px-0 py-8">
        <div className="mb-6">
          <CoverImagePicker
            url={coverUrl}
            onChange={onCoverChange}
            key={coverKey ?? coverUrl ?? "empty"}
          />
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Title"
          aria-label="Story title"
          className="w-full font-sans font-bold text-[32px] sm:text-[42px] leading-[1.24] tracking-[-0.011em] text-text-primary placeholder:text-text-tertiary bg-transparent focus:outline-none"
        />

        <input
          type="text"
          value={subtitle}
          onChange={(e) => onSubtitleChange(e.target.value)}
          placeholder="Tell your story…"
          aria-label="Story subtitle"
          className="mt-2 w-full font-sans text-[18px] sm:text-[22px] leading-[1.27] text-text-secondary placeholder:text-text-tertiary bg-transparent focus:outline-none"
        />

        <div className="mt-8">
          <EditorContent editor={editor} />
        </div>
      </div>

      {showPublish && (
        <PublishDialog
          storyId={story.id}
          initialCoverUrl={coverUrl}
          initialTopicSlugs={story.topicSlugs}
          topicOptions={topicOptions}
          hasPaywallBreak={hasPaywallBreak}
          onClose={() => setShowPublish(false)}
        />
      )}
    </>
  );
}
