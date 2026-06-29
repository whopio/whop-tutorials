import type { NextRequest } from "next/server";
import { jsonWithCors, optionsWithCors } from "@/lib/cors";
import { getCheckoutUrl, getServerEnv } from "@/lib/env";

export function OPTIONS(request: NextRequest) {
  return optionsWithCors(request);
}

export function GET(request: NextRequest) {
  const env = getServerEnv();

  return jsonWithCors(request, {
    appName: "Whop Chrome Extension Starter",
    appUrl: env.publicAppUrl,
    checkoutUrl: getCheckoutUrl(),
    mockMode: env.mockMode,
    oauth: {
      clientId: env.whopAppId,
      scope: "openid profile email",
      resourceId: env.whopResourceId
    }
  });
}
