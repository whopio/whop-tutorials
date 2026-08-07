import { NextResponse } from "next/server";
import { z } from "zod";
import { whop } from "@/lib/whop";
import { writeState, type VerificationStatus } from "@/lib/store";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const body = z
  .object({
    account_id: z.string().min(1),
    first_name: z.string().min(1).max(60),
    last_name: z.string().min(1).max(60),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    country: z.string().length(2),
    tax_identification_number: z.string().optional(),
    address: z.object({
      line1: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      postal_code: z.string().min(1),
    }),
  })
  // Without a tax number a check for someone in the United States still starts
  // and can still be approved, and then the payout account cannot be created
  // later, with nothing on screen to explain why.
  .refine(
    (value) =>
      value.country.toUpperCase() !== "US" || Boolean(value.tax_identification_number),
    { message: "A tax number is required when the country is US" },
  );

export async function POST(request: Request) {
  if (!checkRateLimit(clientIp(request), 5)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { account_id, address, ...prefill } = parsed.data;

  try {
    // The SDK drops RequestOptions.idempotencyKey on the floor, so the header
    // goes on by hand. Derive it from the request rather than using a random
    // value, because a random one turns every retry into a fresh create. A
    // failed create replayed under the same key returns that same failure for
    // 24 hours, so a deliberate retry needs a new key.
    const created = await whop().verifications.create(
      {
        account_id,
        kind: "individual",
        ...prefill,
        address: { ...address, country: prefill.country },
      },
      { headers: { "Idempotency-Key": `verify-${account_id}-individual` } },
    );

    if (!created.id) {
      return NextResponse.json({ error: "Whop returned no record id" }, { status: 502 });
    }

    await writeState({
      accountId: account_id,
      verificationId: created.id,
      status: created.status as VerificationStatus | undefined,
    });

    // Both 200 and 201 land here. 201 is a new check, 200 hands back the one
    // that was already open, so treating only 201 as success breaks anyone who
    // comes back to finish.
    return NextResponse.json({
      id: created.id,
      sessionUrl: created.session_url ?? null,
      status: created.status ?? "pending",
    });
  } catch (error) {
    console.error("verification_create_failed", error);
    return NextResponse.json(
      { error: whopMessage(error) ?? "Could not start the check" },
      { status: 502 },
    );
  }
}

// Whop's own wording on a rejected request is more useful than anything we
// would write, so pass it through when there is one.
function whopMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const shape = error as { error?: { error?: { message?: unknown } } };
  const message = shape.error?.error?.message;
  return typeof message === "string" ? message : null;
}
