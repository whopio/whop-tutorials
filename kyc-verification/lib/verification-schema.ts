import { z } from "zod";
import type { VerificationStatus } from "@/lib/store";

export type RequestedItemType = "text" | "date" | "phone" | "address" | "select" | "files";

export interface RequestedItem {
  id: string;
  field: string;
  type: RequestedItemType;
  label: string;
  description: string | null;
  options: string[];
  errorMessage: string | null;
}

export interface VerifiedAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface VerifiedRecord {
  id: string;
  kind: "individual" | "business";
  status: VerificationStatus;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
  address: VerifiedAddress;
  sessionUrl: string | null;
  requestedInformation: RequestedItem[];
  createdAt: string;
  updatedAt: string | null;
  // Dotted paths of every value we had to repair on the way in. A field that
  // was simply absent is not a repair and never appears here.
  normalised: string[];
}

// Three letter codes turn up on the address while the top level stays on two.
// Only the countries this demo offers are listed. Anything else passes through
// untouched and is still flagged, because a value we did not recognise is
// exactly the kind of thing worth showing on screen.
const ALPHA3: Record<string, string> = {
  USA: "US",
  BRA: "BR",
  NGA: "NG",
  PHL: "PH",
  DEU: "DE",
  TUR: "TR",
};

const raw = z
  .object({
    id: z.string(),
    kind: z.enum(["individual", "business"]).default("individual"),
    status: z.enum([
      "not_started",
      "pending",
      "processing",
      "manual_review",
      "action_required",
      "approved",
      "rejected",
    ]),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    date_of_birth: z.string().nullish(),
    country: z.string().nullish(),
    address: z
      .object({
        line1: z.string().nullish(),
        line2: z.string().nullish(),
        city: z.string().nullish(),
        state: z.string().nullish(),
        postal_code: z.string().nullish(),
        country: z.string().nullish(),
      })
      .nullish(),
    // Gone from the response entirely once the person has nothing left to do,
    // so its absence is a state and never an error.
    session_url: z.string().nullish(),
    requested_information: z
      .array(
        z.object({
          id: z.string(),
          field: z.string(),
          type: z.enum(["text", "date", "phone", "address", "select", "files"]),
          label: z.string(),
          description: z.string().nullish(),
          options: z.array(z.string()).nullish(),
          error_message: z.string().nullish(),
        }),
      )
      .nullish(),
    // Real records carry an offset such as +02:00, not the Z in every docs
    // example, so the offset has to be allowed.
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }).nullish(),
  })
  .passthrough();

export function parseVerification(input: unknown): VerifiedRecord {
  const source = raw.parse(input);
  const normalised: string[] = [];

  // Absent stays absent. Only a value we changed counts as a repair.
  const clean = (value: string | null | undefined, path: string): string | null => {
    if (value === undefined || value === null) return null;
    // Empty strings and the literal four characters n-u-l-l both turn up in
    // live address fields.
    if (value === "" || value === "null") {
      normalised.push(path);
      return null;
    }
    return value;
  };

  const country = (value: string | null | undefined, path: string): string | null => {
    const cleaned = clean(value, path);
    if (cleaned === null) return null;
    if (cleaned.length === 2) return cleaned.toUpperCase();
    normalised.push(path);
    return ALPHA3[cleaned.toUpperCase()] ?? cleaned.toUpperCase();
  };

  const address = source.address ?? {};

  return {
    id: source.id,
    kind: source.kind,
    status: source.status,
    firstName: clean(source.first_name, "firstName"),
    lastName: clean(source.last_name, "lastName"),
    dateOfBirth: clean(source.date_of_birth, "dateOfBirth"),
    country: country(source.country, "country"),
    address: {
      line1: clean(address.line1, "address.line1"),
      line2: clean(address.line2, "address.line2"),
      city: clean(address.city, "address.city"),
      state: clean(address.state, "address.state"),
      postalCode: clean(address.postal_code, "address.postalCode"),
      country: country(address.country, "address.country"),
    },
    sessionUrl: source.session_url ?? null,
    requestedInformation: (source.requested_information ?? []).map((item) => ({
      id: item.id,
      field: item.field,
      type: item.type,
      label: item.label,
      description: item.description ?? null,
      options: item.options ?? [],
      errorMessage: item.error_message ?? null,
    })),
    createdAt: source.created_at,
    updatedAt: source.updated_at ?? null,
    normalised,
  };
}
