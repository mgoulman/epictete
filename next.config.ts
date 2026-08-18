import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "ertxtpmtyeuzqpxqryix.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/oauth-authorization-server',
        destination: '/api/mcp/oauth/well-known',
      },
      {
        source: '/.well-known/oauth-authorization-server/:path*',
        destination: '/api/mcp/oauth/well-known',
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "mg-tech-ey",
  project: "epictete-backoffice",

  // Source-map upload token (build-time secret; set in CI / Vercel env).
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a wider set of client files for better production stack traces.
  widenClientFileUpload: true,

  // Proxy Sentry ingestion through the app to survive ad-blockers.
  tunnelRoute: "/monitoring",

  // Only print build output in CI.
  silent: !process.env.CI,
});
