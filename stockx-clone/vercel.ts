interface VercelConfig {
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  headers?: Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;
}

const config: VercelConfig = {
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
  ],
};

export default config;
