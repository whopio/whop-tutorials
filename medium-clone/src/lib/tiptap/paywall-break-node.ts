import { Node, mergeAttributes, type RawCommands } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paywallBreak: {
      insertPaywallBreak: () => ReturnType;
      removePaywallBreak: () => ReturnType;
    };
  }
}

export const PaywallBreak = Node.create({
  name: "paywallBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  parseHTML() {
    return [{ tag: 'div[data-paywall-break="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-paywall-break": "true",
        class: "paywall-break",
      }),
      [
        "div",
        { class: "paywall-break-inner" },
        "Paid content starts here",
      ],
    ];
  },
  addCommands(): Partial<RawCommands> {
    return {
      insertPaywallBreak:
        () =>
        ({ chain, editor }) => {
          let exists = false;
          editor.state.doc.descendants((node) => {
            if (node.type.name === "paywallBreak") exists = true;
          });
          if (exists) return false;
          return chain().focus().insertContent({ type: "paywallBreak" }).run();
        },
      removePaywallBreak:
        () =>
        ({ chain, editor }) => {
          let pos: number | null = null;
          editor.state.doc.descendants((node, p) => {
            if (node.type.name === "paywallBreak") pos = p;
          });
          if (pos === null) return false;
          return chain()
            .focus()
            .setNodeSelection(pos)
            .deleteSelection()
            .run();
        },
    };
  },
});

// Find the document-relative position of the first paywallBreak node, or null.
export function findPaywallNodePos(doc: { content?: unknown[] } | null | undefined): number | null {
  if (!doc?.content || !Array.isArray(doc.content)) return null;
  const idx = doc.content.findIndex(
    (n) => typeof n === "object" && n !== null && (n as { type?: string }).type === "paywallBreak",
  );
  return idx >= 0 ? idx : null;
}
