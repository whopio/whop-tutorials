"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  addLink,
  deleteLink,
  togglePremium,
  toggleVisibility,
  reorderLinks,
} from "@/app/actions/links";
import type { Link as DbLink } from "@prisma/client";
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
  "block text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-1.5";
const inputClass =
  "w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors bg-white placeholder:text-neutral-300";

export function AddLinkForm() {
  const [state, action, pending] = useActionState(addLink, {});
  const [resetKey, setResetKey] = useState(0);

  // Reset the form on success so users can add another link without
  // manually clearing inputs.
  useEffect(() => {
    if (state.success) setResetKey((k) => k + 1);
  }, [state.success]);

  return (
    <form
      key={resetKey}
      action={action}
      className="space-y-3 border border-dashed border-neutral-200 rounded-lg p-4"
    >
      <p className={labelClass}>Add link</p>

      <input
        name="title"
        placeholder="Link title"
        required
        className={inputClass}
      />
      <input
        name="url"
        type="url"
        placeholder="https://example.com"
        required
        className={inputClass}
      />

      <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
        <input
          type="checkbox"
          name="isPremium"
          className="w-4 h-4 accent-neutral-900"
        />
        Mark as premium (locked behind unlock price)
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg py-2 px-4 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
      >
        {pending ? "Adding..." : "Add link"}
      </button>
    </form>
  );
}

export function LinksList({ links }: { links: DbLink[] }) {
  const [order, setOrder] = useState<string[]>(() => links.map((l) => l.id));
  const [, startTransition] = useTransition();

  // Keep local order in sync with server-provided links (after add/delete).
  useEffect(() => {
    setOrder(links.map((l) => l.id));
  }, [links]);

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
      void reorderLinks(next);
    });
  }

  if (links.length === 0) {
    return (
      <p className="text-sm text-neutral-400 mb-4">
        No links yet. Add one below.
      </p>
    );
  }

  const linksById = new Map(links.map((l) => [l.id, l]));
  const sorted = order
    .map((id) => linksById.get(id))
    .filter(Boolean) as DbLink[];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 mb-4">
          {sorted.map((link) => (
            <SortableLinkRow key={link.id} link={link} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableLinkRow({ link }: { link: DbLink }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const [delState, delAction, delPending] = useActionState(deleteLink, {});
  const [toggleState, toggleAction, togglePending] = useActionState(
    togglePremium,
    {}
  );
  const [visibilityState, visibilityAction, visibilityPending] = useActionState(
    toggleVisibility,
    {}
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
  } as React.CSSProperties;

  const dimmed = !link.isVisible;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5 ${
        isDragging
          ? "border-neutral-900 shadow-lg"
          : "border-neutral-200"
      } ${dimmed ? "opacity-60" : ""}`}
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

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">
          {link.title}
        </p>
        <p className="text-xs text-neutral-400 truncate">{link.url}</p>
      </div>

      <form action={visibilityAction} className="flex">
        <input type="hidden" name="linkId" value={link.id} />
        <button
          type="submit"
          disabled={visibilityPending}
          aria-label={link.isVisible ? "Hide link" : "Show link"}
          aria-pressed={!link.isVisible}
          className="text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-50 px-1.5"
        >
          {link.isVisible ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </form>

      <form action={toggleAction}>
        <input type="hidden" name="linkId" value={link.id} />
        <button
          type="submit"
          disabled={togglePending}
          className={`text-xs font-semibold px-2 py-1 rounded-md border transition-colors ${
            link.isPremium
              ? "bg-neutral-900 text-white border-neutral-900"
              : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400"
          }`}
        >
          {link.isPremium ? "Premium" : "Free"}
        </button>
      </form>

      <form action={delAction}>
        <input type="hidden" name="linkId" value={link.id} />
        <button
          type="submit"
          disabled={delPending}
          aria-label="Delete link"
          className="text-neutral-300 hover:text-red-600 transition-colors disabled:opacity-50 px-1.5"
        >
          <TrashIcon />
        </button>
      </form>

      {(delState.error || toggleState.error || visibilityState.error) && (
        <p className="absolute right-3 -bottom-5 text-xs text-red-600">
          {delState.error ?? toggleState.error ?? visibilityState.error}
        </p>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M2 2l12 12" strokeLinecap="round" />
      <path d="M6.5 4.2C7 4.1 7.5 4 8 4c4 0 6.5 4 6.5 4s-.7 1.1-2 2.3" />
      <path d="M11 11.4C10.1 12 9.1 12.5 8 12.5c-4 0-6.5-4.5-6.5-4.5s.9-1.6 2.6-2.9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path d="M2.5 4h11" strokeLinecap="round" />
      <path d="M6 4V2.5h4V4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3.5 4l.7 9.3a1 1 0 001 .9h5.6a1 1 0 001-.9L12.5 4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
