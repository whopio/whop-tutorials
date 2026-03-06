"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Link,
  ImageIcon,
  Minus,
  Lock,
} from "lucide-react";

interface ToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
}

export function Toolbar({ editor, onImageUpload }: ToolbarProps) {
  const buttons = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
      label: "Bold",
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
      label: "Italic",
    },
    {
      icon: Underline,
      action: () => editor.chain().focus().toggleUnderline().run(),
      active: editor.isActive("underline"),
      label: "Underline",
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive("strike"),
      label: "Strikethrough",
    },
    { type: "divider" as const },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
      label: "Heading 2",
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
      label: "Heading 3",
    },
    { type: "divider" as const },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
      label: "Bullet List",
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
      label: "Ordered List",
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
      label: "Blockquote",
    },
    {
      icon: Code2,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: editor.isActive("codeBlock"),
      label: "Code Block",
    },
    { type: "divider" as const },
    {
      icon: Link,
      action: () => {
        const url = window.prompt("Enter URL:");
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      },
      active: editor.isActive("link"),
      label: "Link",
    },
    {
      icon: ImageIcon,
      action: onImageUpload,
      active: false,
      label: "Image",
    },
    {
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
      label: "Horizontal Rule",
    },
    {
      icon: Lock,
      action: () => editor.chain().focus().setPaywallBreak().run(),
      active: editor.isActive("paywallBreak"),
      label: "Paywall Break",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
      {buttons.map((btn, i) => {
        if ("type" in btn && btn.type === "divider") {
          return (
            <div key={i} className="mx-1 h-6 w-px bg-gray-300" />
          );
        }

        const { icon: Icon, action, active, label } = btn as {
          icon: typeof Bold;
          action: () => void;
          active: boolean;
          label: string;
        };

        return (
          <button
            key={label}
            type="button"
            onClick={action}
            title={label}
            className={`rounded p-1.5 transition-colors ${
              active
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
