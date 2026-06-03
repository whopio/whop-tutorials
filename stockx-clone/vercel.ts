interface VercelConfig {
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  headers?: Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;
}

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "next build",
  outputDirectory: ".next",
  headers: [
    {
      source: "/api/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.whop.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.whop.com https://*.supabase.co wss://*.supabase.co",
            "frame-src https://*.whop.com",
            "frame-ancestors 'none'",
          ].join("; "),
        },
      ],
    },
  ],
};
