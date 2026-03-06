"use client";

import { useRef } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { PaywallBreak } from "./extensions/paywall-break";
import { Toolbar } from "./toolbar";

interface EditorProps {
  initialContent?: JSONContent;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
}

export function Editor({
  initialContent,
  onChange,
  editable = true,
}: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      UnderlineExt,
      LinkExt.configure({ openOnClick: false }),
      ImageExt,
      Placeholder.configure({ placeholder: "Start writing..." }),
      PaywallBreak,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  if (!editor) return null;

  function handleImageUpload() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const formData = new FormData();
    formData.append("files", file);

    try {
      const res = await fetch("/api/uploadthing", {
        method: "POST",
        headers: { "x-uploadthing-package": "uploadthing" },
        body: formData,
      });
      const data = await res.json();
      if (data?.[0]?.ufsUrl) {
        editor.chain().focus().setImage({ src: data[0].ufsUrl }).run();
      }
    } catch {
      alert("Image upload failed. Please try again.");
    }

    e.target.value = "";
  }

  return (
    <div className="rounded-lg border border-gray-200">
      {editable && (
        <Toolbar editor={editor} onImageUpload={handleImageUpload} />
      )}
      <div className="min-h-[400px] p-4">
        <EditorContent editor={editor} />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
