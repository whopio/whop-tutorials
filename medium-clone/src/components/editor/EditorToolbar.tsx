"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Link2,
  Heading1,
  Heading2,
  Quote,
  Code2,
  Minus,
  Image as ImageIcon,
  Lock,
} from "lucide-react";
import { useCallback } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: ToolbarProps) {
  const { startUpload, isUploading } = useUploadThing("storyInlineImage", {
    onClientUploadComplete: (files) => {
      const url = files?.[0]?.ufsUrl;
      if (url && editor) editor.chain().focus().setImage({ src: url }).run();
    },
    onUploadError: (e) => {
      console.error(e);
    },
  });

  const onPickImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) await startUpload([file]);
    };
    input.click();
  }, [startUpload]);

  const onAddLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-[57px] z-20 bg-background/95 backdrop-blur border-b border-border"
    >
      <div className="mx-auto max-w-[680px] flex items-center gap-1 px-4 sm:px-0 py-2 overflow-x-auto">
        <ToolbarButton
          icon={Heading1}
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          icon={Heading2}
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <Divider />
        <ToolbarButton
          icon={Bold}
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={Italic}
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={Link2}
          label="Link"
          active={editor.isActive("link")}
          onClick={onAddLink}
        />
        <Divider />
        <ToolbarButton
          icon={Quote}
          label="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={Code2}
          label="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          icon={Minus}
          label="Divider"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
        <ToolbarButton
          icon={ImageIcon}
          label={isUploading ? "Uploading…" : "Image"}
          onClick={onPickImage}
          disabled={isUploading}
        />
        <Divider />
        <ToolbarButton
          icon={Lock}
          label="Insert paywall break"
          active={editor.isActive("paywallBreak")}
          onClick={() => editor.chain().focus().insertPaywallBreak().run()}
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "shrink-0 size-9 rounded-md flex items-center justify-center transition-colors",
        active
          ? "bg-text-primary text-white"
          : "text-text-secondary hover:bg-surface hover:text-text-primary",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  );
}

function Divider() {
  return <span aria-hidden="true" className="shrink-0 w-px h-5 bg-border mx-1" />;
}
