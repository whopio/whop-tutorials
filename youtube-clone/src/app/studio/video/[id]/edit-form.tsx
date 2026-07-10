"use client";

import { useActionState } from "react";
import { CATEGORIES, VISIBILITIES } from "@/lib/validators";
import {
  deleteVideo,
  updateVideo,
  type UpdateVideoResult,
} from "../../actions";

type EditableVideo = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  category: string;
  membersOnly: boolean;
  isShort: boolean;
};

export function EditVideoForm({ video }: { video: EditableVideo }) {
  const [state, formAction, pending] = useActionState<
    UpdateVideoResult,
    FormData
  >(updateVideo, {});

  return (
    <div className="max-w-2xl">
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={video.id} />

        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">Title</span>
          <input
            name="title"
            defaultValue={video.title}
            required
            maxLength={100}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">Description</span>
          <textarea
            name="description"
            defaultValue={video.description ?? ""}
            rows={5}
            maxLength={5000}
            className="w-full resize-y rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">Visibility</span>
            <select
              name="visibility"
              defaultValue={video.visibility}
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 outline-none focus:border-accent"
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0) + v.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">Category</span>
            <select
              name="category"
              defaultValue={video.category}
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 outline-none focus:border-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="membersOnly"
            defaultChecked={video.membersOnly}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-sm">
            Members only - restrict playback to active channel members
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isShort"
            defaultChecked={video.isShort}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-sm">
            Wave - show this vertical video in the Waves feed
          </span>
        </label>

        {state.error ? (
          <p className="text-sm text-red-500">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-green-500">Saved.</p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>

      <form
        action={deleteVideo}
        onSubmit={(e) => {
          if (!confirm("Delete this video permanently? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
        className="mt-8 border-t border-border pt-6"
      >
        <input type="hidden" name="id" value={video.id} />
        <button
          type="submit"
          className="rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10"
        >
          Delete video
        </button>
      </form>
    </div>
  );
}
