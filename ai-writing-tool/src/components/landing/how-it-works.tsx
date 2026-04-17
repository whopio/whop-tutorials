const STEPS = [
  {
    number: "01",
    title: "Pick a template",
    body: "Choose from eight templates: blog post, email, ad copy, landing page, and more. Each knows its own format and prompt.",
  },
  {
    number: "02",
    title: "Fill in a few inputs",
    body: "Topic, audience, tone, key points. A handful of fields is all it takes. No prompt engineering required.",
  },
  {
    number: "03",
    title: "Refine through chat",
    body: "The AI produces a full draft. Ask for a shorter intro, a new tone, a tighter CTA, and the chat thread keeps going until it's right.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-t border-border-subtle bg-bg py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">How it works</p>
          <h2 className="mt-3 text-[clamp(2rem,3vw,2.75rem)] font-semibold leading-tight tracking-tight text-text-primary">
            From blank page to finished draft in three steps.
          </h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="relative rounded-xl border border-border bg-surface p-6"
            >
              <span className="font-mono text-xs font-medium text-accent">{step.number}</span>
              <h3 className="mt-4 text-lg font-semibold text-text-primary">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
