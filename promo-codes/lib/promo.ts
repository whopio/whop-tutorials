import { WHOP_IDS } from "@/constants/whop-ids";
import { getEnv } from "@/lib/env";
import { getWhop } from "@/lib/whop";

export type PromoType = "percentage" | "flat_amount";
export type PromoStatus = "active" | "inactive" | "archived";

// The shape we hand the client. Deliberately not the raw API object: the raw
// one carries amount_off in an encoding you cannot render (see below).
export interface PromoSummary {
  id: string;
  code: string;
  promoType: PromoType;
  /** Already converted for display: 20 means 20% off, 3 means $3 off. */
  displayAmount: number;
  /** Exactly what the API returned, so the demo can show the difference. */
  rawAmountOff: number;
  label: string;
  status: PromoStatus;
  uses: number;
  stock: number;
  unlimitedStock: boolean;
  onePerCustomer: boolean;
  newUsersOnly: boolean;
  expiresAt: string | null;
  duration: string | null;
  productId: string | null;
}

/**
 * Whop's percentage encoding is asymmetric, and this is the single most
 * expensive thing to get wrong.
 *
 *   write: amount_off = 20    (whole percent, the API enforces 1 to 100)
 *   read:  amount_off = 0.2   (decimal fraction, on create, retrieve and list)
 *
 * Flat amounts do not transform: 3 dollars in, 3 dollars back. So every
 * conversion has to branch on promo_type. Reading a percentage back and
 * rendering it raw prints "0.2% off"; submitting it back is rejected by the
 * 1% floor.
 */
export function toDisplayAmount(promoType: PromoType, rawAmountOff: number) {
  if (promoType !== "percentage") return rawAmountOff;
  // Math.round because 0.15 * 100 is 15.000000000000002 in binary floating point.
  return Math.round(rawAmountOff * 100);
}

export function describeDiscount(promoType: PromoType, displayAmount: number) {
  return promoType === "percentage"
    ? `${displayAmount}% off`
    : `$${displayAmount.toFixed(2)} off`;
}

/** What the buyer would pay, so the demo can predict the receipt before checkout. */
export function previewPrice(
  price: number,
  promoType: PromoType,
  displayAmount: number,
) {
  const discounted =
    promoType === "percentage"
      ? price * (1 - displayAmount / 100)
      : price - displayAmount;
  return Math.max(0, Math.round(discounted * 100) / 100);
}

function isPromoType(value: unknown): value is PromoType {
  return value === "percentage" || value === "flat_amount";
}

function isPromoStatus(value: unknown): value is PromoStatus {
  return value === "active" || value === "inactive" || value === "archived";
}

// The raw API record, narrowed to the fields we read. Kept structural so a
// list item and a full promo code (which adds `account`, `metadata` and
// `updated_at`) both fit through the same converter.
interface RawPromoCode {
  id: string;
  code: string | null;
  promo_type: string;
  amount_off: number;
  status: string;
  uses: number;
  stock: number;
  unlimited_stock: boolean;
  one_per_customer: boolean;
  new_users_only: boolean;
  expires_at: string | null;
  duration: string | null;
  product?: { id: string } | null;
}

export function toSummary(raw: RawPromoCode): PromoSummary {
  const promoType: PromoType = isPromoType(raw.promo_type)
    ? raw.promo_type
    : "percentage";
  const displayAmount = toDisplayAmount(promoType, raw.amount_off);
  return {
    id: raw.id,
    code: raw.code ?? "",
    promoType,
    displayAmount,
    rawAmountOff: raw.amount_off,
    label: describeDiscount(promoType, displayAmount),
    status: isPromoStatus(raw.status) ? raw.status : "inactive",
    uses: raw.uses,
    stock: raw.stock,
    unlimitedStock: raw.unlimited_stock,
    onePerCustomer: raw.one_per_customer,
    newUsersOnly: raw.new_users_only,
    expiresAt: raw.expires_at,
    duration: raw.duration,
    productId: raw.product?.id ?? null,
  };
}

export async function listPromoCodes(): Promise<PromoSummary[]> {
  const env = getEnv();
  const out: PromoSummary[] = [];
  for await (const raw of await getWhop().promoCodes.list({
    account_id: env.WHOP_COMPANY_ID,
  })) {
    out.push(toSummary(raw as unknown as RawPromoCode));
  }
  return out;
}

/**
 * The codes this demo offers, read live from Whop but narrowed to the set the
 * setup script seeded. A sandbox company accumulates codes from every other
 * experiment run against it, and none of them belong on this page.
 */
export async function getSeededCodes(): Promise<PromoSummary[]> {
  // Typed as string keys: WHOP_IDS is `as const`, so the ids would otherwise
  // narrow to literals and refuse a lookup by a plain string.
  const order = new Map<string, number>(
    WHOP_IDS.promoCodes.map((promo, i) => [promo.id, i]),
  );
  const all = await listPromoCodes();
  return all
    .filter((code) => order.has(code.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Put every seeded code back to active, so a reset really does reset. */
export async function reactivateSeededCodes(): Promise<number> {
  const codes = await getSeededCodes();
  const paused = codes.filter((code) => code.status === "inactive");
  const results = await Promise.allSettled(
    paused.map((code) => activatePromoCode(code.id)),
  );
  return results.filter((r) => r.status === "fulfilled").length;
}

/**
 * There is no way to fetch a promo code by its string. The list endpoint
 * filters on account, product, plan, status and dates only, and retrieve takes a
 * promo_ id. So a "check this code before checkout" feature has to list and
 * match locally, which is fine at demo scale and wrong at thousands of codes.
 * At that point you either keep your own index or let the checkout validate.
 */
export async function findByCode(code: string): Promise<PromoSummary | null> {
  // Codes are stored lowercased, so compare lowercased.
  const wanted = code.trim().toLowerCase();
  if (!wanted) return null;
  const all = await listPromoCodes();
  return all.find((promo) => promo.code === wanted) ?? null;
}

export interface CodeVerdict {
  usable: boolean;
  reason: string | null;
  promo: PromoSummary | null;
}

/**
 * Decide whether a code is worth putting in front of a buyer.
 *
 * This exists because the checkout will not tell you. Handing it a code that
 * does not exist, or an archived one, does not raise an error and does not
 * fire onPromoCodeChanged: the checkout simply opens at full price with an
 * empty promo row. From your app's side a dead code and a code nobody typed
 * look identical, so a buyer following last quarter's campaign link pays full
 * price and is never told why. If that matters to you, check first.
 */
export async function evaluateCode(code: string): Promise<CodeVerdict> {
  const promo = await findByCode(code);
  if (!promo) {
    return { usable: false, reason: "No code by that name.", promo: null };
  }
  if (promo.status === "archived") {
    return {
      usable: false,
      reason: "That code was archived and can never be used again.",
      promo,
    };
  }
  if (promo.status !== "active") {
    return { usable: false, reason: "That code is paused right now.", promo };
  }
  if (!promo.unlimitedStock && promo.uses >= promo.stock) {
    return { usable: false, reason: "Every use of that code is gone.", promo };
  }
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
    return { usable: false, reason: "That code has expired.", promo };
  }
  return { usable: true, reason: null, promo };
}

/**
 * Pause and resume. Both verbs live on the SDK's promoCodes resource, and both
 * answer with the full promo code, so the table can redraw from the response.
 */
export async function deactivatePromoCode(id: string) {
  const code = await getWhop().promoCodes.deactivate({ id });
  return toSummary(code as unknown as RawPromoCode);
}

export async function activatePromoCode(id: string) {
  const code = await getWhop().promoCodes.activate({ id });
  return toSummary(code as unknown as RawPromoCode);
}
