import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { PaywallBreak } from "./paywall-break-node";

export const storylineExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: { HTMLAttributes: { class: "story-code" } },
  }),
  Image.configure({
    HTMLAttributes: { class: "story-image" },
    allowBase64: false,
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { class: "story-link", rel: "noopener noreferrer" },
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") return "Title";
      return "Tell your story…";
    },
    emptyEditorClass: "is-editor-empty",
  }),
  PaywallBreak,
];
