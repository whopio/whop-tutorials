const config = {
  framework: "nextjs" as const,
  buildCommand: "prisma generate && next build",
  regions: ["iad1"],
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.whop.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://*.whop.com; img-src 'self' https://*.whop.com https://image.mux.com https://ui-avatars.com data:; media-src 'self' https://stream.mux.com https://*.mux.com blob:; font-src 'self' https://*.whop.com; connect-src 'self' https://*.mux.com https://*.production.mux.com https://*.whop.com wss://*.whop.com https://inferred.litix.io; frame-src 'self' https://*.whop.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
        },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

export default config;
