/**
 * Type augmentation for Whop embedded chat components.
 *
 * The @whop/embedded-components-react-js package documents ChatElement,
 * ChatSession, and DmsListElement as part of its public API, but the
 * current published version only ships payouts components.
 *
 * This declaration adds the chat-related types so the build passes.
 * At runtime, the component checks for their existence before rendering.
 * Once Whop ships an updated package, this file can be removed.
 */

import type { CSSProperties, FC, ReactNode } from "react";

declare module "@whop/embedded-components-react-js" {
  export interface ChatElementOptions {
    channelId: string;
    deeplinkToPostId?: string;
    onEvent?: (event: {
      type: string;
      detail: Record<string, unknown>;
    }) => void;
  }

  export interface ChatElementProps {
    options: ChatElementOptions;
    style?: CSSProperties;
  }

  export interface ChatSessionProps {
    token: () => Promise<string>;
    children: ReactNode;
  }

  export const ChatElement: FC<ChatElementProps>;
  export const ChatSession: FC<ChatSessionProps>;
}
