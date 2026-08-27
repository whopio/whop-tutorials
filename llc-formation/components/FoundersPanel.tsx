"use client";

import { Button, Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { Field, TextInput } from "@/components/Field";
import type { Application, Founder } from "@/lib/formation/schema";
import { OFFICER_ROLES, type OfficerRole } from "@/lib/formation/states";
import { label } from "@/lib/formation/taxonomy";

const BLANK: Founder = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "+1",
  is_primary: false,
  date_of_birth: "",
  ssn: "",
  ownership_percentage: 0,
  roles: [],
  address: { line1: "", line2: "", city: "", state: "", postal_code: "", country: "US" },
};

export function FoundersPanel({
  app,
  update,
  flagged,
}: {
  app: Application;
  update: (patch: Partial<Application>) => void;
  flagged: string | null;
}) {
  const llc = app.entity_type === "llc";
  const owned = app.founders.reduce((sum, f) => sum + (f.ownership_percentage ?? 0), 0);

  function patchFounder(index: number, patch: Partial<Founder>) {
    update({
      founders: app.founders.map((founder, i) =>
        i === index ? { ...founder, ...patch } : founder,
      ),
    });
  }

  // Exactly one founder is primary, so making one primary unmakes the rest
  // here rather than leaving the visitor to trip the server rule by accident.
  function makePrimary(index: number) {
    update({
      founders: app.founders.map((founder, i) => ({ ...founder, is_primary: i === index })),
    });
  }

  function toggleRole(index: number, role: OfficerRole) {
    const roles = app.founders[index]?.roles ?? [];
    patchFounder(index, {
      roles: roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role],
    });
  }

  return (
    <Panel
      annotationId="founders"
      step={3}
      title="Their founders"
      blurb={
        llc
          ? "Every member of your user's company, their share, and which one signs for the filing."
          : "Every member of your user's company, the offices they hold, and which one signs."
      }
      aside={
        llc ? (
          <span
            className={[
              "shrink-0 rounded-md px-2 py-1 font-mono text-[11px]",
              owned === 100 ? "bg-[#F1F1F0] text-[#151515]" : "bg-[#FFF6F3] text-[#D93900]",
            ].join(" ")}
          >
            {owned}% of 100
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {app.founders.map((founder, index) => (
          <div key={index} className="rounded-lg border border-[#E5E4E0] bg-[#FAFAF9] p-3">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="primary-founder"
                  checked={founder.is_primary}
                  onChange={() => makePrimary(index)}
                  className="h-3.5 w-3.5 accent-[#FA4616]"
                />
                <Text size="2" weight="medium">
                  {founder.is_primary ? "Responsible party" : "Make responsible party"}
                </Text>
              </label>
              {app.founders.length > 1 && (
                <Button
                  type="button"
                  size="1"
                  variant="soft"
                  color="gray"
                  onClick={() =>
                    update({ founders: app.founders.filter((_, i) => i !== index) })
                  }
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label="First name">
                <TextInput
                  value={founder.first_name}
                  onChange={(first_name) => patchFounder(index, { first_name })}
                />
              </Field>
              <Field label="Last name">
                <TextInput
                  value={founder.last_name}
                  onChange={(last_name) => patchFounder(index, { last_name })}
                />
              </Field>
              <Field label="Email" hint="never checked">
                <TextInput
                  value={founder.email}
                  onChange={(email) => patchFounder(index, { email })}
                />
              </Field>
              <Field label="Phone" hint="E.164, never checked">
                <TextInput
                  value={founder.phone}
                  onChange={(phone) => patchFounder(index, { phone })}
                />
              </Field>
              <Field label="Date of birth" hint="optional, never checked">
                <TextInput
                  value={founder.date_of_birth ?? ""}
                  onChange={(date_of_birth) => patchFounder(index, { date_of_birth })}
                  placeholder="1990-04-12"
                />
              </Field>
              <Field label="SSN" hint="leave empty if not a US resident">
                <TextInput
                  value={founder.ssn ?? ""}
                  onChange={(ssn) => patchFounder(index, { ssn })}
                  placeholder="123-45-6789"
                />
              </Field>
            </div>

            {llc ? (
              <div className="mt-2.5 sm:max-w-[220px]">
                <Field label="Ownership" hint="must total 100" flagged={flagged === "founders"}>
                  <TextInput
                    type="number"
                    value={String(founder.ownership_percentage ?? 0)}
                    onChange={(value) =>
                      patchFounder(index, { ownership_percentage: Number(value) || 0 })
                    }
                  />
                </Field>
              </div>
            ) : (
              <div
                className={[
                  "mt-2.5 rounded-lg border p-2.5",
                  flagged === "founders"
                    ? "border-[#D93900] bg-[#FFF6F3]"
                    : "border-transparent",
                ].join(" ")}
              >
                <Text size="1" weight="medium" as="div" className="mb-1.5">
                  Offices held
                  {flagged === "founders" && (
                    <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#D93900]">
                      Whop flagged this
                    </span>
                  )}
                </Text>
                <div className="flex flex-wrap gap-1.5">
                  {OFFICER_ROLES.map((role) => {
                    const on = (founder.roles ?? []).includes(role);
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => toggleRole(index, role)}
                        className={[
                          "rounded-md border px-2 py-1 text-[12px] transition",
                          on
                            ? "border-[#FA4616] bg-[#FA4616] text-white"
                            : "border-[#E5E4E0] bg-white text-[#151515] hover:border-[#FA4616]/40",
                        ].join(" ")}
                      >
                        {label(role)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              <Field label="Street">
                <TextInput
                  value={founder.address.line1}
                  onChange={(line1) =>
                    patchFounder(index, { address: { ...founder.address, line1 } })
                  }
                />
              </Field>
              <Field label="City">
                <TextInput
                  value={founder.address.city}
                  onChange={(city) =>
                    patchFounder(index, { address: { ...founder.address, city } })
                  }
                />
              </Field>
              <Field label="State or region">
                <TextInput
                  value={founder.address.state}
                  onChange={(state) =>
                    patchFounder(index, { address: { ...founder.address, state } })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Postal code">
                  <TextInput
                    value={founder.address.postal_code}
                    onChange={(postal_code) =>
                      patchFounder(index, { address: { ...founder.address, postal_code } })
                    }
                  />
                </Field>
                <Field label="Country">
                  <TextInput
                    value={founder.address.country}
                    onChange={(country) =>
                      patchFounder(index, { address: { ...founder.address, country } })
                    }
                  />
                </Field>
              </div>
            </div>
          </div>
        ))}

        {app.founders.length < 6 && (
          <Button
            type="button"
            size="2"
            variant="soft"
            color="gray"
            onClick={() => update({ founders: [...app.founders, { ...BLANK }] })}
          >
            Add another founder
          </Button>
        )}
      </div>
    </Panel>
  );
}
