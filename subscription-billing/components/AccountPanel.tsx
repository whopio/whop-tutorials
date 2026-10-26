import { Badge, Button, Code, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";

export function AccountPanel({ signedIn }: { signedIn: boolean }) {
  return (
    <Panel
      step={1}
      id="account"
      title="Sign in"
      meta={signedIn ? <Badge color="green">Signed in</Badge> : null}
      footnote={
        <>
          Whop OAuth returns the user&apos;s Whop id and email. The app keeps both in an encrypted{" "}
          <Code size="1">iron-session</Code> cookie.
        </>
      }
    >
      {signedIn ? (
        <div className="flex flex-col gap-2">
          <Text size="3" weight="bold">
            You&apos;re signed in with Whop
          </Text>
          <Text size="2" color="gray">
            Your Whop user id is how this app finds your subscription. There&apos;s no user table and
            no database.
          </Text>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <Text size="2" color="gray">
            Sign in the way your subscribers would. The checkout then uses your Whop email, so the
            subscription lands on your Whop account.
          </Text>
          <Text size="1" color="gray">
            It&apos;s a sandbox demo, so sign in with a free sandbox.whop.com account.
          </Text>
          <Button size="3" asChild>
            <a href="/api/auth/login">Sign in with Whop</a>
          </Button>
        </div>
      )}
    </Panel>
  );
}
