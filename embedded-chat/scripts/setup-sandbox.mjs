// One-command sandbox provisioning for the Orbit embedded-chat demo.
//
// Idempotent. Creates, on the Whop sandbox:
//   - 3 demo users as connected accounts (Ava, Ben, Cara), named + owned
//   - a product + a public "General" Chat channel (chat_feed_)
//   - a public read-only "Announcements" Chat channel (who_can_post: admins)
//   - a group DM (Ava, Ben, Cara) and a 1:1 DM (Ava, Ben)
//   - a support chat for each demo user
//   - realistic seed messages / a poll / reactions, authored by the users
// Then writes every id into constants/whop-ids.ts (consumed by the app).
//
// Chat channels are made public (is_public: true) so the company's own
// connected-account users can post without a paid membership. Messages are
// authored with minted USER tokens because the company key cannot post as a
// user (it can create channels + moderate, but not send messages).
//
// Run from code/:  npm run setup
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

const KEY = env.WHOP_COMPANY_API_KEY;
const CID = env.WHOP_COMPANY_ID;
const BASE = "https://sandbox-api.whop.com/api/v1";
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
    log(`  ! ${path} as ${userId}: ${res.status} ${text.slice(0, 140)}`);
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

// ── owner (admin / support agent) ─────────────────────────────────────────
const company = await whop.companies.retrieve(CID);
const OWNER = company.owner_user.id;
log(`owner: ${OWNER} (@${company.owner_user.username})`);
// The owner posts announcements and support replies; show a brand persona
// instead of the operator's personal name.
try {
  await whop.users.update(OWNER, { account_id: CID, name: "Orbit Team" });
  log("owner display name -> Orbit Team");
} catch (e) {
  log(`owner rename skipped: ${e?.status} ${e?.message}`);
}

// ── 1. Demo users (connected accounts) ────────────────────────────────────
// Neutral demo email base; the mailbox itself is never used (company-key auth,
// send_customer_emails: false). Existing accounts are matched by title on re-run.
const demoEmail = (name) => `orbit.demo.${name}@gmail.com`;
const WANT = [
  { key: "ava", name: "Ava Chen", email: demoEmail("ava") },
  { key: "ben", name: "Ben Ortiz", email: demoEmail("ben") },
  { key: "cara", name: "Cara Lee", email: demoEmail("cara") },
];

log("\n=== 1. Demo users ===");
const children = await collect(await whop.companies.list({ parent_company_id: CID }));
const demoUsers = [];
for (const want of WANT) {
  let child = children.find((c) => c.title === want.name);
  if (!child) {
    child = await whop.companies.create({
      email: want.email,
      parent_company_id: CID,
      title: want.name,
      send_customer_emails: false,
      metadata: { internal_user_id: `demo_${want.key}` },
    });
    log(`created ${want.name} -> ${child.id}`);
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

// ── 3. Chat channels (public so connected users can post) ─────────────────
log("\n=== 3. Chat channels ===");
const experiences = await collect(await whop.experiences.list({ company_id: CID }));
async function ensureChannel(name) {
  let exp = experiences.find((e) => e.app?.id === CHAT_APP_ID && e.name === name);
  if (!exp) {
    exp = await whop.experiences.create({
      app_id: CHAT_APP_ID,
      company_id: CID,
      name,
      is_public: true,
    });
    log(`created experience "${name}" -> ${exp.id}`);
  } else {
    log(`reusing experience "${name}" -> ${exp.id}`);
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
  return { experienceId: exp.id, id: channel.id };
}
const general = await ensureChannel("General");
const announcements = await ensureChannel("Announcements");
try {
  await whop.chatChannels.update(announcements.id, { who_can_post: "admins" });
  log("  Announcements set read-only (who_can_post: admins)");
} catch (e) {
  log(`  read-only update failed: ${e?.status} ${e?.message}`);
}

// ── 4. DMs ────────────────────────────────────────────────────────────────
log("\n=== 4. DMs ===");
const groupDm = await whop.dmChannels.create({
  with_user_ids: [ava.userId, ben.userId, cara.userId],
  company_id: CID,
  custom_name: "Orbit team",
});
log(`group DM -> ${groupDm.id}`);
const directDm = await whop.dmChannels.create({
  with_user_ids: [ava.userId, ben.userId],
  company_id: CID,
  custom_name: "Ava & Ben",
});
log(`1:1 DM -> ${directDm.id}`);

// ── 5. Support chats (one per user) ───────────────────────────────────────
log("\n=== 5. Support chats ===");
const supportByUser = {};
for (const u of demoUsers) {
  const sc = await whop.supportChannels.create({
    company_id: CID,
    user_id: u.userId,
    custom_name: `${u.name.split(" ")[0]} - support`,
  });
  supportByUser[u.key] = sc.id;
  log(`support (${u.name}) -> ${sc.id}`);
}

// ── 6. Seed content (authored by the users) ───────────────────────────────
log("\n=== 6. Seed content ===");
async function listAsUser(userId, channelId) {
  const res = await fetch(
    `${BASE}/messages?channel_id=${channelId}&first=1`,
    { headers: { Authorization: `Bearer ${await tokenFor(userId)}` } },
  );
  if (!res.ok) return { ok: false, status: res.status };
  const d = await res.json();
  return { ok: true, count: (d?.data ?? []).length };
}
// readerId must be a participant that can read the channel (the owner works
// for public channels/support, but NOT for DMs the owner isn't a member of).
async function hasAnyMessages(channelId, readerId) {
  try {
    const e = await collect(await whop.messages.list({ channel_id: channelId }), 1);
    if (e.length) return true;
  } catch {
    /* company key can't always read; fall back to the reader token */
  }
  const r = await listAsUser(readerId, channelId);
  return r.ok && r.count > 0;
}
async function seedIfEmpty(channelId, seeder, readerId = OWNER) {
  try {
    if (await hasAnyMessages(channelId, readerId)) {
      log(`  ${channelId}: has messages, skip`);
      return;
    }
    await seeder();
    log(`  ${channelId}: seeded`);
  } catch (e) {
    log(`  ${channelId}: seed error ${e?.status ?? ""} ${e?.message ?? e}`);
  }
}

await seedIfEmpty(general.id, async () => {
  await post(ava.userId, general.id, "Hey everyone, welcome to the Orbit community! 👋");
  await post(ben.userId, general.id, "Glad to be here. This whole chat is live on Whop's sandbox.");
  const poll = await post(cara.userId, general.id, "What should we build first?", {
    poll: {
      options: [
        { id: "1", text: "A weekly office-hours channel" },
        { id: "2", text: "A show-and-tell thread" },
      ],
    },
  });
  await post(ava.userId, general.id, "Reactions, replies, polls and attachments all work in here.");
  if (poll?.id) {
    await react(ava.userId, poll.id, undefined, "1");
    await react(ben.userId, poll.id, undefined, "2");
  }
});

// Announcements often carries a system message (settings change), so seed a
// real admin announcement only when no author-written message exists.
try {
  const res = await fetch(
    `${BASE}/messages?channel_id=${announcements.id}&first=20`,
    { headers: { Authorization: `Bearer ${await tokenFor(OWNER)}` } },
  );
  const d = res.ok ? await res.json() : { data: [] };
  const hasReal = (d.data ?? []).some((m) => m.message_type === "regular");
  if (!hasReal) {
    const r = await post(
      OWNER,
      announcements.id,
      "📣 Welcome to Orbit! This is a read-only announcements channel: only admins can post here, and everyone can read. Try switching users below - the composer disappears for non-admins.",
    );
    log(r ? "  announcements: posted announcement" : "  announcements: owner could not post");
  } else {
    log("  announcements: already has an announcement, skip");
  }
} catch (e) {
  log(`  announcements seed error: ${e?.message ?? e}`);
}

await seedIfEmpty(
  groupDm.id,
  async () => {
    await post(ava.userId, groupDm.id, "Starting our group thread here.");
    await post(ben.userId, groupDm.id, "Nice. DMs can hold up to 50 people.");
    await post(cara.userId, groupDm.id, "And they show up in the DMs list on the left.");
  },
  ava.userId,
);
await seedIfEmpty(
  directDm.id,
  async () => {
    await post(ava.userId, directDm.id, "Ben, this is a private 1:1 DM.");
    await post(ben.userId, directDm.id, "Got it, just the two of us here.");
  },
  ava.userId,
);

for (const u of demoUsers) {
  await seedIfEmpty(supportByUser[u.key], async () => {
    await post(u.userId, supportByUser[u.key], "Hi, I have a question about getting started.");
    const r = await post(
      OWNER,
      supportByUser[u.key],
      "Hi! Thanks for reaching out. Ask away and our team will help.",
    );
    if (!r) log(`  (owner could not post to ${u.name}'s support chat)`);
  });
}

// ── 6.5 Access verification (what each user can READ in the browser) ──────
log("\n=== 6.5 Access verification (read as user) ===");
const checks = [
  ["general        as Ava ", ava.userId, general.id],
  ["general        as Ben ", ben.userId, general.id],
  ["announcements  as Ava ", ava.userId, announcements.id],
  ["groupDm        as Cara", cara.userId, groupDm.id],
  ["directDm       as Ava ", ava.userId, directDm.id],
  ["directDm       as Cara", cara.userId, directDm.id],
  ["support(Ava)   as Ava ", ava.userId, supportByUser.ava],
  ["support(Ava)   as Ben ", ben.userId, supportByUser.ava],
];
for (const [label, uid, cid] of checks) {
  const r = await listAsUser(uid, cid);
  log(`  ${label}: ${r.ok ? `READ ok (${r.count} msg)` : `NO ACCESS ${r.status}`}`);
}

// ── 7. Persist ids ────────────────────────────────────────────────────────
log("\n=== 7. Write constants/whop-ids.ts ===");
const data = {
  companyId: CID,
  ownerUserId: OWNER,
  demoUsers: demoUsers.map((u) => ({ key: u.key, name: u.name, userId: u.userId })),
  channels: {
    general: { id: general.id, experienceId: general.experienceId, name: "General", readOnly: false },
    announcements: {
      id: announcements.id,
      experienceId: announcements.experienceId,
      name: "Announcements",
      readOnly: true,
    },
  },
  dms: {
    group: { id: groupDm.id, name: "Orbit team" },
    direct: { id: directDm.id, name: "Ava & Ben" },
  },
  supportByUser,
  productId: product.id,
};

const file = `// AUTO-GENERATED by scripts/setup-sandbox.mjs. Do not edit by hand.
// Re-run \`npm run setup\` to regenerate against your own sandbox company.

export interface DemoUser {
  key: string;
  name: string;
  userId: string;
}

export interface ChannelInfo {
  id: string;
  experienceId: string;
  name: string;
  readOnly: boolean;
}

export const companyId = ${JSON.stringify(data.companyId)};
export const ownerUserId = ${JSON.stringify(data.ownerUserId)};

export const demoUsers: DemoUser[] = ${JSON.stringify(data.demoUsers, null, 2)};

export const channels: Record<"general" | "announcements", ChannelInfo> = ${JSON.stringify(data.channels, null, 2)};

export const dms: Record<"group" | "direct", { id: string; name: string }> = ${JSON.stringify(data.dms, null, 2)};

export const supportByUser: Record<string, string> = ${JSON.stringify(data.supportByUser, null, 2)};

export const productId = ${JSON.stringify(data.productId)};

export const knownUserIds = demoUsers.map((u) => u.userId);
export function isKnownUser(userId: string): boolean {
  return knownUserIds.includes(userId);
}
`;
mkdirSync(new URL("constants/", ROOT), { recursive: true });
writeFileSync(new URL("constants/whop-ids.ts", ROOT), file);
log("wrote constants/whop-ids.ts");
log("\nDone.\n", j(data));
