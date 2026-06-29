import Link from "next/link";
import { DEMO_PRODUCT, FEATURE_MATRIX } from "@/lib/plans";

export default function HomePage() {
  return (
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Whop for Chrome extension founders</p>
          <h1>{DEMO_PRODUCT.name}</h1>
          <p className="lead">{DEMO_PRODUCT.description}</p>
          <div className="hero-actions">
            <Link className="button primary" href="/checkout?source=homepage">
              Open Whop checkout
            </Link>
            <Link className="button secondary" href="/docs">
              Setup docs
            </Link>
          </div>
        </div>

        <div className="extension-preview" aria-label="Whop extension starter preview">
          <div className="browser-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-card">
            <div>
              <p className="mini-label">Extension popup</p>
              <h2>Whop access active</h2>
            </div>
            <div className="score-row">
              <span>Gate status</span>
              <strong>Premium</strong>
            </div>
            <div className="meter">
              <span style={{ width: "100%" }} />
            </div>
            <div className="preview-list">
              <span>Sign in with Whop</span>
              <span>Open billing portal</span>
              <span>Unlock gated feature</span>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="section-heading">
          <p className="eyebrow">Template behavior</p>
          <h2>Login, billing, and access gating for your extension business.</h2>
        </div>
        <div className="feature-grid">
          {FEATURE_MATRIX.map((feature) => (
            <article className="feature-card" key={feature.name}>
              <p className="feature-tier">{feature.tier}</p>
              <h3>{feature.name}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
