// Walkthrough content for the left rail. Each step highlights a
// [data-annotation-id] region in the demo and explains what Whop is doing.
export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

export const steps: WalkthroughStep[] = [
  {
    id: "users",
    title: "Every user is a real Whop account",
    body: "Ava, Ben and Cara are `connected accounts` created with `companies.create`. Switch between them here: each acts through its own short-lived, company-scoped token, minted server-side for every call. The embed tab fetches its token from `/api/chat/prod-token`; the Chat API tab mints one inside its message routes.",
  },
  {
    id: "surfaces",
    title: "Three chat types, one element",
    body: "Channels (public rooms), direct messages (private, up to 50 people) and support chats (one-to-one with your team) all render in the same chat surface. They differ only by their id prefix: `chat_feed_` for channels, `feed_` for DMs and support.",
  },
  {
    id: "chat",
    title: "Or render it yourself with the Chat API",
    body: "The Chat API tab renders the same conversations from plain REST, so you can build a fully custom UI and test the whole flow on sandbox. To keep this public demo tidy, messages you type there are simulated: they appear instantly for you, can be deleted, and clear on refresh instead of persisting to the shared channel.",
  },
  {
    id: "moderation",
    title: "Moderate from your backend",
    body: "Make General read-only, add slow mode, or block links and media. These call `chatChannels.update` with the company key and the `chat:moderate` permission. Switch to a member and the composer reacts instantly.",
  },
  {
    id: "theme",
    title: "Theme it to match your app",
    body: "These are the same presets as Whop's official playground: each maps to an `accentColor` the drop-in element accepts, plus light or dark and an iMessage or Discord layout. Changes apply to the live chat instantly.",
  },
  {
    id: "embed",
    title: "The drop-in you ship",
    body: "The Prebuilt embed tab is exactly this: Whop's `<ChatElement>`, live on a production company. One component renders the complete chat UI, replies, reactions, media and realtime updates. Switch profiles and post for real; it is the polished path most apps ship.",
  },
];
