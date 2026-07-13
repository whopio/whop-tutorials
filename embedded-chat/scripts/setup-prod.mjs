// One-command PRODUCTION provisioning for the Orbit live-element demo surface.
//
// Idempotent. Creates, on the real whop.com company behind WHOP_PROD_COMPANY_ID:
//   - 3 demo users as connected accounts (Ava, Ben, Cara), named + owned
//   - one public "General" Chat channel (chat_feed_) with HEAVY moderation
//     (slow mode, banned words, links + media blocked) because it is a public,
//     writable surface on production
//   - a seed conversation authored by the users
// Then writes every id into constants/whop-ids.prod.ts (consumed by the app).
//
// This is the smaller sibling of setup-sandbox.mjs: the embed tab is a focused,
// playground-style single channel. The fuller surface tour (announcements, DMs,
// support) stays on the sandbox "Chat API" tab.
//
// Run from code/:  npm run setup:prod
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Whop from "@whop/sdk";

const ROOT = new URL("../", import.meta.url);
const env = Object.fromEntries(
  readFileSync(new URL(".env.local", ROOT), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
);

const KEY = env.WHOP_PROD_API_KEY;
const CID = env.WHOP_PROD_COMPANY_ID;
if (!KEY || !CID) {
  console.error("Missing WHOP_PROD_API_KEY / WHOP_PROD_COMPANY_ID in .env.local");
  process.exit(1);
}
const BASE = "https://api.whop.com/api/v1";
const CHAT_APP_ID = "app_xml5hbizmZPgUT"; // built-in Whop "Chat" app

const whop = new Whop({ apiKey: KEY, baseURL: BASE });
const log = (...a) => console.log(...a);
const j = (o) => JSON.stringify(o, null, 2);

const FULL_SCOPES = [
  "chat:message:create",
  "chat:read",
  "dms:read",
  "dms:message:manage",
  "dms:channel:manage",
  "support_chat:read",
  "support_chat:message:create",
];

// Heavy moderation for a public, writable production channel. Kept in one place
// so the reset route can re-assert the exact same settings after wiping.
const BANNED_WORDS = [
  "fuck", "shit", "bitch", "cunt", "asshole", "dick", "piss", "bastard",
  "nigger", "nigga", "faggot", "fag", "retard", "spic", "chink", "kike", "tranny",
  "whore", "slut", "rape", "kys",
  "onlyfans", "porn", "nudes", "crypto pump", "free money", "click here", "airdrop",
];

const MODERATION = {
  who_can_post: "everyone",
  who_can_react: "everyone",
  ban_urls: true,
  ban_media: true,
  user_posts_cooldown_seconds: 5,
  banned_words: BANNED_WORDS,
};

const tokenCache = new Map();
async function tokenFor(userId) {
  if (tokenCache.has(userId)) return tokenCache.get(userId);
  const { token } = await whop.accessTokens.create({
    company_id: CID,
    user_id: userId,
    scoped_actions: FULL_SCOPES,
  });
  tokenCache.set(userId, token);
  return token;
}
async function asUser(userId, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await tokenFor(userId)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    log(`  ! ${path} as ${userId}: ${res.status} ${text.slice(0, 160)}`);
    return null;
  }
  return JSON.parse(text);
}
async function post(userId, channel_id, content, extra = {}) {
  return asUser(userId, "/messages", { channel_id, content, ...extra });
}
async function react(userId, resource_id, emoji, poll_option_id) {
  return asUser(userId, "/reactions", {
    resource_id,
    ...(emoji ? { emoji } : {}),
    ...(poll_option_id ? { poll_option_id } : {}),
  });
}
async function collect(res, max = 300) {
  const out = [];
  if (res?.[Symbol.asyncIterator]) {
    for await (const i of res) {
      out.push(i);
      if (out.length >= max) break;
    }
  } else if (Array.isArray(res?.data)) out.push(...res.data);
  return out;
}

// Delete every message in a channel, as a channel admin (the owner). Used by the
// RESEED path to clear a seed authored by superseded demo accounts.
async function wipeChannel(channelId, adminUserId) {
  const token = await tokenFor(adminUserId);
  let deleted = 0;
  for (let round = 0; round < 20; round++) {
    const res = await fetch(`${BASE}/messages?channel_id=${channelId}&first=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    const msgs = (await res.json())?.data ?? [];
    if (!msgs.length) break;
    let any = false;
    for (const m of msgs) {
      const del = await fetch(`${BASE}/messages/${encodeURIComponent(m.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (del.ok) { deleted++; any = true; continue; }
      try { await whop.messages.delete(m.id); deleted++; any = true; } catch {}
    }
    if (!any) break; // stop if a page cannot be deleted, rather than loop forever
  }
  return deleted;
}

// ── owner (admin) ─────────────────────────────────────────────────────────
const company = await whop.companies.retrieve(CID);
const OWNER = company.owner_user.id;
log(`owner: ${OWNER} (@${company.owner_user.username})`);
try {
  await whop.users.update(OWNER, { account_id: CID, name: "Orbit Team" });
  log("owner display name -> Orbit Team (company-scoped)");
} catch (e) {
  log(`owner rename skipped: ${e?.status} ${e?.message}`);
}

// ── 1. Demo users (connected accounts) ────────────────────────────────────
// Demo email base, read from .env.local (gitignored) so it never lands in the
// committed source. Production requires a REAL, deliverable inbox, so this must
// be a throwaway address you actually created. We plus-address it per user, which
// stays deliverable to that one inbox while giving three distinct accounts. The
// public chat handle derives from the local part (base "orbitchat" gives
// @orbitchatava), so pick a base that carries no one's real name.
const DEMO_BASE = env.WHOP_PROD_DEMO_EMAIL;
if (!DEMO_BASE || !DEMO_BASE.includes("@")) {
  console.error(
    "Set WHOP_PROD_DEMO_EMAIL in .env.local to a real throwaway inbox you\n" +
      "control. Production rejects addresses that cannot receive mail, so\n" +
      "example.com style placeholders will not work.",
  );
  process.exit(1);
}
const demoEmail = (name) => DEMO_BASE.replace("@", `+${name}@`);
const MARKER = (key) => `orbit_demo_${key}`; // tags our accounts for re-runs
const WANT = [
  { key: "ava", name: "Ava Chen", email: demoEmail("ava") },
  { key: "ben", name: "Ben Ortiz", email: demoEmail("ben") },
  { key: "cara", name: "Cara Lee", email: demoEmail("cara") },
];

log("\n=== 1. Demo users ===");
const children = await collect(await whop.companies.list({ parent_company_id: CID }));
const demoUsers = [];
for (const want of WANT) {
  // Match accounts from earlier runs by their metadata marker. The marker does
  // not encode the email base: if WHOP_PROD_DEMO_EMAIL changes, delete or
  // retitle the old connected accounts first, or this run reuses them (and
  // their old email-derived handles).
  let child = children.find((c) => c.metadata?.internal_user_id === MARKER(want.key));
  if (!child) {
    child = await whop.companies.create({
      email: want.email,
      parent_company_id: CID,
      title: want.name,
      send_customer_emails: false,
      metadata: { internal_user_id: MARKER(want.key) },
    });
    log(`created ${want.name} -> ${child.id} (${want.email})`);
  } else {
    log(`reusing ${want.name} -> ${child.id}`);
  }
  let ownerUser = child.owner_user;
  if (!ownerUser?.id) ownerUser = (await whop.companies.retrieve(child.id)).owner_user;
  try {
    await whop.users.update(ownerUser.id, { account_id: CID, name: want.name });
  } catch (e) {
    log(`  (name override skipped: ${e?.status} ${e?.message})`);
  }
  demoUsers.push({ key: want.key, name: want.name, userId: ownerUser.id });
}
log(j(demoUsers));
const [ava, ben, cara] = demoUsers;

// ── 2. Product ────────────────────────────────────────────────────────────
log("\n=== 2. Product ===");
const products = await collect(await whop.products.list({ company_id: CID }));
let product = products.find((p) => p.title === "Orbit Community");
if (!product) {
  product = await whop.products.create({
    company_id: CID,
    title: "Orbit Community",
    description: "Membership that unlocks the Orbit community chat.",
    visibility: "visible",
  });
  log(`created product -> ${product.id}`);
} else {
  log(`reusing product -> ${product.id}`);
}

// ── 3. General channel (public so connected users can post) ───────────────
log("\n=== 3. General channel ===");
const experiences = await collect(await whop.experiences.list({ company_id: CID }));
let exp = experiences.find((e) => e.app?.id === CHAT_APP_ID && e.name === "General");
if (!exp) {
  exp = await whop.experiences.create({
    app_id: CHAT_APP_ID,
    company_id: CID,
    name: "General",
    is_public: true,
  });
  log(`created experience "General" -> ${exp.id}`);
} else {
  log(`reusing experience "General" -> ${exp.id}`);
  try {
    await whop.experiences.update(exp.id, { is_public: true });
  } catch {}
}
try {
  await whop.experiences.attach(exp.id, { product_id: product.id });
} catch (e) {
  if (!String(e?.message).toLowerCase().includes("alread"))
    log(`  attach note: ${e?.status} ${e?.message}`);
}
const channel = await whop.chatChannels.retrieve(exp.id);
log(`  channel -> ${channel.id}`);

// ── 4. Seed conversation (authored by the users) ──────────────────────────
log("\n=== 4. Seed content ===");
async function listAsUser(userId, channelId, first = 1) {
  const res = await fetch(
    `${BASE}/messages?channel_id=${channelId}&first=${first}`,
    { headers: { Authorization: `Bearer ${await tokenFor(userId)}` } },
  );
  if (!res.ok) return { ok: false, status: res.status };
  const d = await res.json();
  return { ok: true, count: (d?.data ?? []).length };
}
// One-time cleanup: RESEED=1 clears an old seed (e.g. authored by superseded
// accounts) so the block below reseeds it with the current demo users.
if (process.env.RESEED === "1") {
  const removed = await wipeChannel(channel.id, OWNER);
  log(`  RESEED: cleared ${removed} old message(s)`);
}
const existing = await listAsUser(ava.userId, channel.id, 1);
if (existing.ok && existing.count > 0) {
  log("  General already has messages, skip seed");
} else {
  // Seed with slow mode off, then apply it in step 5, so the cooldown does
  // not throttle the seed's back-to-back posts.
  await whop.chatChannels.update(channel.id, { user_posts_cooldown_seconds: 0 }).catch(() => {});
  await post(ava.userId, channel.id, "Hey everyone, welcome to Orbit! 👋");
  await post(ben.userId, channel.id, "Heads up: this is the real Whop chat element, live on production.");
  const poll = await post(cara.userId, channel.id, "What should we ship next?", {
    poll: {
      options: [
        { id: "1", text: "Weekly office hours" },
        { id: "2", text: "A show-and-tell thread" },
      ],
    },
  });
  await post(ava.userId, channel.id, "Switch profiles below and send a message, it posts for real. Replies, reactions and real-time updates all work in here.");
  if (poll?.id) {
    await react(ava.userId, poll.id, undefined, "1");
    await react(ben.userId, poll.id, undefined, "2");
  }
  log("  General seeded");
}

// ── 5. Moderation (after seeding, so slow mode does not throttle it) ───────
log("\n=== 5. Moderation ===");
try {
  await whop.chatChannels.update(channel.id, MODERATION);
  log(`  applied (slow mode ${MODERATION.user_posts_cooldown_seconds}s, ${BANNED_WORDS.length} banned words, links + media blocked)`);
} catch (e) {
  log(`  moderation update failed: ${e?.status} ${e?.message}`);
}

// ── 6. Persist ids ────────────────────────────────────────────────────────
log("\n=== 6. Write constants/whop-ids.prod.ts ===");
const data = {
  provisioned: true,
  companyId: CID,
  ownerUserId: OWNER,
  demoUsers: demoUsers.map((u) => ({ key: u.key, name: u.name, userId: u.userId })),
  channel: { id: channel.id, experienceId: exp.id, name: "General" },
};

const file = `// AUTO-GENERATED by scripts/setup-prod.mjs. Do not edit by hand.
// Re-run \`npm run setup:prod\` to regenerate against your own production company.
//
// Public ids only (company / user / channel). The production API KEY is a secret
// and lives only in .env.local + Vercel env, never here.

export interface DemoUser {
  key: string;
  name: string;
  userId: string;
}

// True once the production company has been provisioned. The live-element
// section renders a "coming soon" placeholder while this is false.
export const provisioned = ${data.provisioned};
export const companyId = ${JSON.stringify(data.companyId)};
export const ownerUserId = ${JSON.stringify(data.ownerUserId)};

export const demoUsers: DemoUser[] = ${JSON.stringify(data.demoUsers, null, 2)};

export const channel = ${JSON.stringify(data.channel, null, 2)};

export const knownUserIds = demoUsers.map((u) => u.userId);
export function isKnownUser(userId: string): boolean {
  return knownUserIds.includes(userId);
}
`;
mkdirSync(new URL("constants/", ROOT), { recursive: true });
writeFileSync(new URL("constants/whop-ids.prod.ts", ROOT), file);
log("wrote constants/whop-ids.prod.ts");
log("\nDone.\n", j(data));
