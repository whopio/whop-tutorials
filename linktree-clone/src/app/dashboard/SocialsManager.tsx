"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addSocialLink,
  deleteSocialLink,
  reorderSocialLinks,
  setSocialColor,
} from "@/app/actions/socials";
import { SOCIALS, getSocialPlatform } from "@/lib/socials";
import type { SocialLink as DbSocialLink } from "@prisma/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const labelClass =
  "block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2";
const inputClass =
  "w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-white placeholder:text-neutral-300";

export function SocialsManager({
  socials,
  hasProfile,
}: {
  socials: DbSocialLink[];
  hasProfile: boolean;
}) {
  return (
    <div className="space-y-4">
      {hasProfile ? (
        <>
          <SocialsList socials={socials} />
          <AddSocialForm />
        </>
      ) : (
        <p className="text-sm text-neutral-400">
          Save your profile first to add social links.
        </p>
      )}
    </div>
  );
}

function AddSocialForm() {
  const [state, action, pending] = useActionState(addSocialLink, {});
  const [resetKey, setResetKey] = useState(0);
  const [platform, setPlatform] = useState(SOCIALS[0].key);

  useEffect(() => {
    if (state.success) setResetKey((k) => k + 1);
  }, [state.success]);

  return (
    <form
      key={resetKey}
      action={action}
      className="rounded-lg border border-dashed border-neutral-200 p-3 space-y-2"
    >
      <p className={labelClass}>Add social</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          name="platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className={`${inputClass} sm:max-w-[160px]`}
        >
          {SOCIALS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          name="url"
          type="text"
          placeholder={platform === "email" ? "you@example.com" : "https://..."}
          required
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {pending ? "Adding..." : "Add"}
        </button>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

function SocialsList({ socials }: { socials: DbSocialLink[] }) {
  const [order, setOrder] = useState<string[]>(() => socials.map((s) => s.id));
  const [, startTransition] = useTransition();

  useEffect(() => {
    setOrder(socials.map((s) => s.id));
  }, [socials]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    startTransition(() => {
      void reorderSocialLinks(next);
    });
  }

  if (socials.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        No socials yet. Add your first one below.
      </p>
    );
  }

  const byId = new Map(socials.map((s) => [s.id, s]));
  const sorted = order.map((id) => byId.get(id)).filter(Boolean) as DbSocialLink[];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {sorted.map((s) => (
            <SortableSocialRow key={s.id} social={s} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableSocialRow({ social }: { social: DbSocialLink }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: social.id });

  const platform = getSocialPlatform(social.platform);
  const [delState, delAction, delPending] = useActionState(deleteSocialLink, {});
  const [colorState, colorAction, colorPending] = useActionState(
    setSocialColor,
    {}
  );
  const [optimisticColor, setOptimisticColor] = useState<string | null>(
    social.color
  );

  if (!platform) return null;

  const swatchColor = optimisticColor ?? platform.brandColor;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-2 ${
        isDragging ? "border-neutral-900 shadow-lg" : "border-neutral-200"
      }`}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="touch-none cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 transition-colors px-1"
        {...attributes}
        {...listeners}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="4" cy="3" r="1.2" />
          <circle cx="10" cy="3" r="1.2" />
          <circle cx="4" cy="7" r="1.2" />
          <circle cx="10" cy="7" r="1.2" />
          <circle cx="4" cy="11" r="1.2" />
          <circle cx="10" cy="11" r="1.2" />
        </svg>
      </button>

      <span
        className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: `${swatchColor}1f`, color: swatchColor }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path d={platform.path} />
        </svg>
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">
          {platform.label}
        </p>
        <p className="text-xs text-neutral-400 truncate">{social.url}</p>
      </div>

      <form action={colorAction} className="flex items-center">
        <input type="hidden" name="id" value={social.id} />
        <label
          className="relative inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-neutral-200 hover:border-neutral-400"
          aria-label="Pick custom icon color"
          style={{ background: swatchColor }}
        >
          <input
            type="color"
            name="color"
            className="sr-only"
            value={
              /^#[0-9a-fA-F]{6}$/.test(swatchColor) ? swatchColor : "#000000"
            }
            disabled={colorPending}
            onChange={(e) => {
              const next = e.target.value.toLowerCase();
              setOptimisticColor(next);
              const fd = new FormData();
              fd.append("id", social.id);
              fd.append("color", next);
              void colorAction(fd);
            }}
          />
        </label>
        {social.color && (
          <button
            type="button"
            onClick={() => {
              setOptimisticColor(null);
              const fd = new FormData();
              fd.append("id", social.id);
              fd.append("color", "");
              void colorAction(fd);
            }}
            disabled={colorPending}
            className="ml-1 text-[10px] text-neutral-400 hover:text-neutral-700"
            aria-label="Reset to brand color"
          >
            reset
          </button>
        )}
      </form>

      <form action={delAction}>
        <input type="hidden" name="id" value={social.id} />
        <button
          type="submit"
          disabled={delPending}
          aria-label="Delete social"
          className="text-neutral-300 hover:text-red-600 transition-colors disabled:opacity-50 px-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M2.5 4h11" strokeLinecap="round" />
            <path d="M6 4V2.5h4V4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.5 4l.7 9.3a1 1 0 001 .9h5.6a1 1 0 001-.9L12.5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>

      {(delState.error || colorState.error) && (
        <p className="absolute right-3 -bottom-5 text-xs text-red-600">
          {delState.error ?? colorState.error}
        </p>
      )}
    </div>
  );
}
