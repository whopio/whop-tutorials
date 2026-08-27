import { z } from "zod";
import { FORMATION_STATES, OFFICER_ROLES } from "@/lib/formation/states";

// Deliberately loose. This schema guards the route against junk, it does not
// try to be Whop's validator: the whole point of the demo is to let Whop answer
// for itself. The only hard constraints are the ones that would otherwise turn
// into a malformed request rather than a useful error.
const addressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  postal_code: z.string(),
  country: z.string(),
});

const founderSchema = z.object({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone: z.string(),
  is_primary: z.boolean(),
  date_of_birth: z.string().optional(),
  ssn: z.string().optional(),
  ownership_percentage: z.number().optional(),
  roles: z.array(z.enum(OFFICER_ROLES)).optional(),
  address: addressSchema,
});

export const applicationSchema = z.object({
  business_name: z.string(),
  entity_type: z.enum(["llc", "c_corp"]),
  entity_suffix: z.string().optional(),
  formation_state: z.string(),
  business_type: z.string(),
  industry_group: z.string(),
  industry_type: z.string(),
  business_website: z.string().optional(),
  business_phone: z.string().optional(),
  business_address: addressSchema.optional(),
  use_registered_agent: z.boolean(),
  expedite_ein: z.boolean(),
  share_structure: z
    .object({ number_of_shares: z.number(), value: z.number() })
    .optional(),
  founders: z.array(founderSchema).min(1).max(6),
});

export type Application = z.infer<typeof applicationSchema>;
export type Founder = z.infer<typeof founderSchema>;
export type Address = z.infer<typeof addressSchema>;

export const STATE_CODES: readonly string[] = FORMATION_STATES;

// The request body Whop sees. Anything the endpoint ignores for this entity
// type is stripped here rather than sent and silently dropped, so the JSON the
// demo shows the reader is the JSON that went over the wire.
export function toRequestBody(app: Application): Record<string, unknown> {
  const llc = app.entity_type === "llc";

  const founders = app.founders.map((founder) => ({
    first_name: founder.first_name,
    last_name: founder.last_name,
    email: founder.email,
    phone: founder.phone,
    is_primary: founder.is_primary,
    ...(founder.date_of_birth ? { date_of_birth: founder.date_of_birth } : {}),
    ...(founder.ssn ? { ssn: founder.ssn } : {}),
    ...(llc
      ? { ownership_percentage: founder.ownership_percentage ?? 0 }
      : { roles: founder.roles ?? [] }),
    address: compactAddress(founder.address),
  }));

  return {
    business_name: app.business_name,
    entity_type: app.entity_type,
    ...(app.entity_suffix ? { entity_suffix: app.entity_suffix } : {}),
    formation_state: app.formation_state,
    business_type: app.business_type,
    industry_group: app.industry_group,
    industry_type: app.industry_type,
    ...(app.business_website ? { business_website: app.business_website } : {}),
    ...(app.use_registered_agent
      ? { use_registered_agent: true }
      : {
          ...(app.business_address
            ? { business_address: compactAddress(app.business_address) }
            : {}),
          ...(app.business_phone ? { business_phone: app.business_phone } : {}),
        }),
    ...(app.expedite_ein ? { expedite_ein: true } : {}),
    ...(!llc && app.share_structure ? { share_structure: app.share_structure } : {}),
    founders,
  };
}

function compactAddress(address: Address): Record<string, string> {
  const { line2, ...rest } = address;
  return line2 ? { ...rest, line2 } : rest;
}
