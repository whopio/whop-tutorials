import { Heading, Text } from "@whop/react/components";

// Left-rail teaching prose. Static server component.
export function ChatExplainer({ sandbox }: { sandbox: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <Heading size="6" style={{ fontFamily: "var(--font-acid)" }}>
        How embedded chat works with Whop
      </Heading>

      <Text size="2" color="gray" as="p">
        Whop hosts the messages, realtime updates, media uploads and
        moderation. You mint a short-lived token for each of your own users and
        drop in one element. There is no chat database to run and no websockets
        to manage.
      </Text>

      <Text size="2" color="gray" as="p">
        On the right is Orbit, a small community app, rendered two ways. The
        Prebuilt embed tab is Whop&apos;s drop-in{" "}
        <code>&lt;ChatElement&gt;</code>, live on a production company. The Chat
        API tab renders the same kind of conversation from plain REST, on
        sandbox, with a UI you control. Toggle between them above the chat.
      </Text>

      <Text size="1" color="gray" as="p">
        The embed is fully interactive: switch profiles and post for real. It is
        heavily moderated and resets periodically. In the Chat API tab, the
        messages you type are simulated locally so the shared sandbox channels
        stay clean.
      </Text>

      {sandbox ? (
        <Text size="1" color="gray" as="p">
          The Chat API tab runs on Whop&apos;s sandbox; the Prebuilt embed runs
          on a separate production company.
        </Text>
      ) : null}

      <Text size="1" color="gray" as="p">
        Companion demo for the article on adding embedded chats with Whop.
      </Text>
    </div>
  );
}
