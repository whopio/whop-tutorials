/**
 * Production preflight — run before promoting Storyline from sandbox to prod.
 *
 *   npx tsx scripts/preflight-prod.ts
 *
 * Walks the env, pings the Whop API, validates the Plus plan + webhook, and
 * surfaces every issue we know to look for. Exits non-zero on any failure.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Whop from "@whop/sdk";

interface CheckResult {
  name: string;
  status: "ok" | "warn" | "fail";
  detail?: string;
}

function ok(name: string, detail?: string): CheckResult {
  return { name, status: "ok", detail };
}
function warn(name: string, detail: string): CheckResult {
  return { name, status: "warn", detail };
}
function fail(name: string, detail: string): CheckResult {
  return { name, status: "fail", detail };
}

const REQUIRED_FOR_PROD = [
  "WHOP_APP_API_KEY",
  "WHOP_CLIENT_ID",
  "WHOP_CLIENT_SECRET",
  "WHOP_COMPANY_API_KEY",
  "WHOP_COMPANY_ID",
  "WHOP_WEBHOOK_SECRET",
  "STORYLINE_PLUS_PLAN_ID",
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "SESSION_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "UPLOADTHING_TOKEN",
  "ROOT_OPERATOR_EMAIL",
  "CRON_SECRET",
];

async function main() {
  const results: CheckResult[] = [];

  // ─── Env presence ─────────────────────────────────────────────────────────
  for (const key of REQUIRED_FOR_PROD) {
    const value = process.env[key];
    if (!value) {
      results.push(fail(`env.${key}`, "Not set"));
    } else if (value.trim() !== value) {
      results.push(fail(`env.${key}`, "Has leading/trailing whitespace — fix before continuing"));
    } else if (value.startsWith("placeholder")) {
      results.push(fail(`env.${key}`, "Still set to a placeholder"));
    } else {
      results.push(ok(`env.${key}`));
    }
  }

  // ─── Sandbox / production toggles ─────────────────────────────────────────
  const sandbox = process.env.WHOP_SANDBOX;
  if (sandbox === "true") {
    results.push(
      fail(
        "env.WHOP_SANDBOX",
        "Still set to 'true' — unset (or set to false) before promoting to production",
      ),
    );
  } else {
    results.push(ok("env.WHOP_SANDBOX", "production mode"));
  }
  if (process.env.NEXT_PUBLIC_WHOP_SANDBOX === "true") {
    results.push(
      fail(
        "env.NEXT_PUBLIC_WHOP_SANDBOX",
        "Still 'true' — the embedded checkout will load the sandbox JS bundle in production",
      ),
    );
  } else {
    results.push(ok("env.NEXT_PUBLIC_WHOP_SANDBOX"));
  }

  // ─── Webhook secret has no trailing newline ───────────────────────────────
  const secret = process.env.WHOP_WEBHOOK_SECRET ?? "";
  if (secret && secret !== secret.replace(/\s+$/, "")) {
    results.push(
      fail("WHOP_WEBHOOK_SECRET", "Trailing whitespace — signature verification will fail silently"),
    );
  }

  // ─── Whop API reachability + plan exists ─────────────────────────────────
  try {
    const whop = new Whop({
      apiKey: process.env.WHOP_COMPANY_API_KEY ?? "",
      baseURL: "https://api.whop.com/api/v1",
    });
    const planId = process.env.STORYLINE_PLUS_PLAN_ID ?? "";
    if (planId) {
      const plan = await whop.plans.retrieve(planId);
      if (plan?.id) {
        results.push(ok("Whop plan", `${plan.id} (${(plan as { plan_type?: string }).plan_type ?? "?"})`));
      } else {
        results.push(fail("Whop plan", "Plan not found — re-run scripts/create-plus-plan.ts"));
      }
    }
  } catch (e) {
    results.push(
      fail("Whop API", e instanceof Error ? e.message : "Could not reach the Whop API"),
    );
  }

  // ─── CSP sanity (string match against vercel.ts isn't possible from here;
  //     just remind the operator) ─────────────────────────────────────────────
  results.push(
    warn(
      "CSP",
      "Manually verify vercel.ts script-src includes js.whop.com but NOT sandbox-js.whop.com",
    ),
  );

  // ─── App URL is HTTPS ─────────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (!appUrl.startsWith("https://")) {
    results.push(
      fail("NEXT_PUBLIC_APP_URL", "Must be HTTPS in production for OAuth and account links"),
    );
  }

  // ─── Print results ────────────────────────────────────────────────────────
  const symbols = { ok: "[OK]  ", warn: "[WARN]", fail: "[FAIL]" };
  for (const r of results) {
    console.log(`${symbols[r.status]} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  }

  const failures = results.filter((r) => r.status === "fail").length;
  console.log(`\n${results.length} checks, ${failures} failed.`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
