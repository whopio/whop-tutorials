import { NextResponse } from "next/server";
import { z } from "zod";
import { whop } from "@/lib/whop";
import { readState, writeState } from "@/lib/store";
import { parseVerification } from "@/lib/verification-schema";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const body = z.object({
  answers: z
    .array(
      z.object({
        id: z.string().startsWith("inrqi_"),
        value: z.string().optional(),
        address: z
          .object({
            line1: z.string(),
            line2: z.string().optional(),
            city: z.string(),
            state: z.string(),
            postal_code: z.string(),
            country: z.string(),
          })
          .optional(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  if (!checkRateLimit(clientIp(request), 10)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = body.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const state = await readState();
  if (!state.verificationId) {
    return NextResponse.json({ error: "No check to answer" }, { status: 409 });
  }

  try {
    // Answered items leave the list, so what comes back next is only what is
    // still open. Note that the create call takes an address under the key
    // address and this one takes it under personal_address. Sending address
    // here is an unsupported field and comes back 400. The address inside a
    // requested_information entry is a different thing and keeps its own name.
    await whop().verifications.update(state.verificationId, {
      requested_information: parsed.data.answers,
    });

    const record = parseVerification(
      await whop().verifications.retrieve(state.verificationId),
    );
    await writeState({ status: record.status });

    return NextResponse.json({
      status: record.status,
      remaining: record.requestedInformation.length,
    });
  } catch (error) {
    console.error("follow_up_failed", error);
    return NextResponse.json(
      { error: whopMessage(error) ?? "Could not send the answers" },
      { status: 502 },
    );
  }
}

function whopMessage(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const shape = error as { error?: { error?: { message?: unknown } } };
  const message = shape.error?.error?.message;
  return typeof message === "string" ? message : null;
}
