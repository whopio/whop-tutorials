import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paywallBreak: {
      setPaywallBreak: () => ReturnType;
    };
  }
}

export const PaywallBreak = Node.create({
  name: "paywallBreak",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="paywall-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "paywall-break",
        class: "paywall-break",
      }),
      "Content below is for paid subscribers only",
    ];
  },

  addCommands() {
    return {
      setPaywallBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-p": () => this.editor.commands.setPaywallBreak(),
    };
  },
});
