import Link from "next/link";

const REPO_URL =
  "https://github.com/whopio/whop-tutorials/tree/main/paid-chrome-extension";

export default function DocsPage() {
  return (
    <main className="narrow-page">
      <p className="eyebrow">Setup</p>
      <h1>Configure the template</h1>
      <p className="lead">
        The starter runs in mock mode out of the box so you can try the full flow
        before adding Whop credentials. Connect real Whop login, checkout, billing,
        and access checks by setting the environment variables and loading the
        built extension.
      </p>

      <section className="plain-section">
        <h2>Steps</h2>
        <ol className="steps">
          <li>
            Copy <code>apps/web/.env.example</code> to{" "}
            <code>apps/web/.env.local</code>, and <code>extension/.env.example</code>{" "}
            to <code>extension/.env</code>.
          </li>
          <li>
            Create a Whop app, then set the OAuth client id, App API key, access
            resource id, and plan id.
          </li>
          <li>
            Add <code>https://&lt;extension-id&gt;.chromiumapp.org/whop</code> as the
            Whop OAuth redirect URI.
          </li>
          <li>
            Run <code>pnpm dev:web</code> and <code>pnpm build:extension</code>, then
            load <code>extension/dist</code> at <code>chrome://extensions</code>.
          </li>
        </ol>
      </section>

      <div className="hero-actions">
        <a
          className="button primary"
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
        >
          Full README and guide
        </a>
        <Link className="button secondary" href="/demo">
          See how it works
        </Link>
      </div>
    </main>
  );
}
