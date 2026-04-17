"use client";

const BLOG_SAMPLE =
  "Remote work has redrawn the boundaries of the office, and with it, the texture of our days. The morning commute, once a forced pause between home and focus, is gone. In its place, a soft transition: coffee in hand, laptop open, the rituals of attention reassembling themselves in the quiet of a bedroom or a kitchen counter. What we lose in camaraderie, we gain in agency. The best remote teams have learned that trust is the real operating system. ";

const EMAIL_SAMPLE =
  "Subject: Following up on our discussion, next steps.   Hi Sarah, thanks for the time yesterday. I wanted to put the key points from our call in writing so nothing slips. We agreed that your team will scope the integration pilot this week, and I'll share the technical spec by Friday. Once you've reviewed, we can align on a two-week build window and then plan the rollout in phases. Let me know if I missed anything, and I'll get the spec over shortly. Best,  Alex ";

export function Marquee() {
  // Repeat the sample text a few times to make the scroll seamless.
  const blogRow = Array.from({ length: 4 }, () => BLOG_SAMPLE).join("");
  const emailRow = Array.from({ length: 4 }, () => EMAIL_SAMPLE).join("");

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        maskImage:
          "radial-gradient(ellipse 70% 55% at 50% 50%, transparent 0%, transparent 35%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.7) 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 70% 55% at 50% 50%, transparent 0%, transparent 35%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.7) 100%)",
      }}
    >
      <div className="marquee-row marquee-row-ltr absolute top-[22%] left-0 right-0">
        <div className="marquee-track">
          <span>{blogRow}</span>
          <span aria-hidden="true">{blogRow}</span>
        </div>
      </div>
      <div className="marquee-row marquee-row-rtl absolute bottom-[22%] left-0 right-0">
        <div className="marquee-track">
          <span>{emailRow}</span>
          <span aria-hidden="true">{emailRow}</span>
        </div>
      </div>
    </div>
  );
}
