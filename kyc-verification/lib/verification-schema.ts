import { z } from "zod";
import type { VerificationStatus } from "@/lib/store";

export type RequestedItemType =
  | "text"
  | "date"
  | "phone"
  | "address"
  | "select"
  | "files"
  | "id_document"
  | "text_with_files"
  | "liveness";

export interface RequestedItem {
  id: string;
  field: string;
  type: RequestedItemType;
  label: string;
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
  normalised: string[];
}

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
    session_url: z.string().nullish(),
    requested_information: z
      .array(
        z.object({
          id: z.string(),
          requirement: z.string(),
          type: z.enum([
            "text",
            "date",
            "phone",
            "address",
            "select",
            "files",
            "id_document",
            "text_with_files",
            "liveness",
          ]),
          label: z.string(),
          options: z.array(z.string()).nullish(),
          errors: z.array(z.object({ reason: z.string().nullish() })).nullish(),
        }),
      )
      .nullish(),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }).nullish(),
  })
  .passthrough();

export function parseVerification(input: unknown): VerifiedRecord {
  const source = raw.parse(input);
  const normalised: string[] = [];

  const clean = (value: string | null | undefined, path: string): string | null => {
    if (value === undefined || value === null) return null;
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
      field: item.requirement,
      type: item.type,
      label: item.label,
      options: item.options ?? [],
      errorMessage: item.errors?.[0]?.reason ?? null,
    })),
    createdAt: source.created_at,
    updatedAt: source.updated_at ?? null,
    normalised,
  };
}
