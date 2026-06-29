import { getServerEnv } from "./env";
import type { AccessLevel } from "./types";

const WHOP_API_BASE = "https://api.whop.com";

export type WhopUserInfo = {
  sub: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
};

export type WhopAccessResponse = {
  has_access: boolean;
  access_level: AccessLevel;
  source?: "whop-api-key" | "whop-user-token";
};

export type WhopMembership = {
  id: string;
  status?: string;
  manage_url?: string | null;
  user?: { id?: string };
  product?: { id?: string };
  plan?: { id?: string };
};

export class WhopApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function parseWhopResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new WhopApiError(
      `Whop API request failed with ${response.status}${errorBody ? `: ${errorBody}` : ""}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchWhopUserInfo(accessToken: string) {
  const response = await fetch(`${WHOP_API_BASE}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000)
  });

  return parseWhopResponse<WhopUserInfo>(response);
}

export async function checkWhopAccess({
  userId,
  userAccessToken
}: {
  userId: string;
  userAccessToken: string;
}) {
  const env = getServerEnv();
  const resourceId = env.whopResourceId;

  async function requestAccess(
    authToken: string,
    source: NonNullable<WhopAccessResponse["source"]>
  ) {
    const response = await fetch(
      `${WHOP_API_BASE}/api/v1/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(resourceId)}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000)
      }
    );

    const access = await parseWhopResponse<WhopAccessResponse>(response);
    return { ...access, source };
  }

  if (env.whopApiKey) {
    try {
      return await requestAccess(env.whopApiKey, "whop-api-key");
    } catch (error) {
      if (!(error instanceof WhopApiError) || ![401, 403].includes(error.status)) {
        throw error;
      }
      console.error(
        `Whop API key rejected on access check (${error.status}). Falling back to the user token; check WHOP_API_KEY.`
      );
    }
  }

  return requestAccess(userAccessToken, "whop-user-token");
}

export async function findBillingPortalUrl({
  userId,
  userAccessToken
}: {
  userId: string;
  userAccessToken: string;
}) {
  const env = getServerEnv();
  const params = new URLSearchParams({
    first: "10",
    user_ids: userId
  });

  if (env.whopCompanyId) {
    params.set("company_id", env.whopCompanyId);
  }

  if (env.whopResourceId.startsWith("prod_")) {
    params.set("product_ids", env.whopResourceId);
  }

  if (env.whopPlanId) {
    params.set("plan_ids", env.whopPlanId);
  }

  async function requestMemberships(authToken: string) {
    const response = await fetch(`${WHOP_API_BASE}/api/v1/memberships?${params}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });

    return parseWhopResponse<{ data?: WhopMembership[] }>(response);
  }

  let memberships: { data?: WhopMembership[] };

  if (env.whopApiKey) {
    try {
      memberships = await requestMemberships(env.whopApiKey);
    } catch (error) {
      if (!(error instanceof WhopApiError) || ![401, 403].includes(error.status)) {
        throw error;
      }
      console.error(
        `Whop API key rejected on membership lookup (${error.status}). Falling back to the user token; check WHOP_API_KEY.`
      );
      memberships = await requestMemberships(userAccessToken);
    }
  } else {
    memberships = await requestMemberships(userAccessToken);
  }

  const activeMembership =
    memberships.data?.find(
      (membership) =>
        membership.manage_url &&
        ["active", "trialing", "past_due", "completed"].includes(membership.status || "")
    ) || memberships.data?.find((membership) => membership.manage_url);

  return activeMembership?.manage_url || env.billingPortalFallbackUrl;
}
