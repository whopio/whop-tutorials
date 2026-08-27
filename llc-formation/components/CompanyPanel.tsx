"use client";

import { Text } from "@whop/react/components";
import { Panel } from "@/components/Panel";
import { Field, SelectInput, TextInput, Toggle } from "@/components/Field";
import type { Application } from "@/lib/formation/schema";
import { CORP_SUFFIXES, FORMATION_STATES, LLC_SUFFIXES } from "@/lib/formation/states";
import { BUSINESS_TYPES, groupsFor, label, typesFor } from "@/lib/formation/taxonomy";

export function CompanyPanel({
  app,
  update,
  flagged,
}: {
  app: Application;
  update: (patch: Partial<Application>) => void;
  flagged: string | null;
}) {
  const llc = app.entity_type === "llc";
  const groups = groupsFor(app.business_type);
  const types = typesFor(app.business_type, app.industry_group);
  const address = app.business_address;
  const hasSsn = app.founders.some((founder) => (founder.ssn ?? "").trim().length > 0);

  // Changing a level of the taxonomy invalidates the ones under it, so both
  // get reset to the first valid child rather than left pointing at nothing.
  function setBusinessType(value: string) {
    const group = groupsFor(value)[0] ?? "";
    update({
      business_type: value,
      industry_group: group,
      industry_type: typesFor(value, group)[0] ?? "",
    });
  }

  function setEntityType(value: string) {
    const next = value as Application["entity_type"];
    update({ entity_type: next, entity_suffix: next === "llc" ? "LLC" : "Inc." });
  }

  function patchAddress(patch: Partial<NonNullable<Application["business_address"]>>) {
    if (!address) return;
    update({ business_address: { ...address, ...patch } });
  }

  return (
    <Panel
      annotationId="company"
      step={2}
      title="Their company"
      blurb="Its legal name, what kind of entity it is, which state registers it, and where it lives."
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <Field label="Legal name" flagged={flagged === "business_name"}>
            <TextInput
              value={app.business_name}
              onChange={(business_name) => update({ business_name })}
              placeholder="Ridgemont Detailing"
            />
          </Field>
          <Field label="Entity ending">
            <SelectInput
              value={app.entity_suffix ?? ""}
              onChange={(entity_suffix) => update({ entity_suffix })}
              options={(llc ? LLC_SUFFIXES : CORP_SUFFIXES).map((value) => ({
                value,
                label: value,
              }))}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Entity type">
            <SelectInput
              value={app.entity_type}
              onChange={setEntityType}
              options={[
                { value: "llc", label: "LLC" },
                { value: "c_corp", label: "C-Corp" },
              ]}
            />
          </Field>
          <Field label="State of formation" flagged={flagged === "formation_state"}>
            <SelectInput
              value={app.formation_state}
              onChange={(formation_state) => update({ formation_state })}
              options={FORMATION_STATES.map((value) => ({ value, label: value }))}
            />
          </Field>
        </div>

        <Field
          label="Business type"
          hint="three linked fields, all three must match"
          flagged={flagged === "business_type"}
        >
          <SelectInput
            value={app.business_type}
            onChange={setBusinessType}
            options={BUSINESS_TYPES.map((value) => ({ value, label: label(value) }))}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Industry group" flagged={flagged === "industry_group"}>
            <SelectInput
              value={app.industry_group}
              onChange={(industry_group) =>
                update({
                  industry_group,
                  industry_type: typesFor(app.business_type, industry_group)[0] ?? "",
                })
              }
              options={groups.map((value) => ({ value, label: label(value) }))}
              disabled={groups.length === 0}
            />
          </Field>
          <Field label="Industry type" flagged={flagged === "industry_type"}>
            <SelectInput
              value={app.industry_type}
              onChange={(industry_type) => update({ industry_type })}
              options={types.map((value) => ({ value, label: label(value) }))}
              disabled={types.length === 0}
            />
          </Field>
        </div>

        <Toggle
          checked={app.use_registered_agent}
          onChange={(use_registered_agent) => update({ use_registered_agent })}
          label="Use the registered agent's address"
          detail="Whop supplies the address and the agent. Turn this off and your user has to give you a company address and phone."
        />

        {!app.use_registered_agent && (
          <div
            className={[
              "grid gap-2.5 rounded-lg border p-3 sm:grid-cols-2",
              flagged === "business_address"
                ? "border-[#D93900] bg-[#FFF6F3]"
                : "border-[#E5E4E0] bg-[#FAFAF9]",
            ].join(" ")}
          >
            <Field label="Street">
              <TextInput
                value={address?.line1 ?? ""}
                onChange={(line1) => patchAddress({ line1 })}
              />
            </Field>
            <Field label="Suite or unit" hint="optional">
              <TextInput
                value={address?.line2 ?? ""}
                onChange={(line2) => patchAddress({ line2 })}
              />
            </Field>
            <Field label="City">
              <TextInput value={address?.city ?? ""} onChange={(city) => patchAddress({ city })} />
            </Field>
            <Field label="State">
              <TextInput
                value={address?.state ?? ""}
                onChange={(state) => patchAddress({ state })}
              />
            </Field>
            <Field label="Postal code">
              <TextInput
                value={address?.postal_code ?? ""}
                onChange={(postal_code) => patchAddress({ postal_code })}
              />
            </Field>
            <Field label="Country">
              <TextInput
                value={address?.country ?? ""}
                onChange={(country) => patchAddress({ country })}
              />
            </Field>
            <Field label="Business phone" hint="required without an agent">
              <TextInput
                value={app.business_phone ?? ""}
                onChange={(business_phone) => update({ business_phone })}
                placeholder="+12125550100"
              />
            </Field>
            <Field label="Website" hint="optional">
              <TextInput
                value={app.business_website ?? ""}
                onChange={(business_website) => update({ business_website })}
                placeholder="https://ridgemont.example"
              />
            </Field>
          </div>
        )}

        <Toggle
          checked={app.expedite_ein}
          onChange={(expedite_ein) => update({ expedite_ein })}
          label="Expedite their EIN"
          detail="Adds $250 to what your user pays. Only for founders without a US Social Security Number, whose EIN otherwise takes up to eight weeks."
        />

        {app.expedite_ein && hasSsn && (
          <div
            className={[
              "rounded-lg border p-2.5",
              flagged === "expedite_ein"
                ? "border-[#D93900] bg-[#FFF6F3]"
                : "border-[#E5E4E0] bg-[#FAFAF9]",
            ].join(" ")}
          >
            <Text size="1" color="gray" as="p">
              A founder below has an SSN filled in. Whop refuses that combination, and it
              refuses it by name. Send it and read the sentence it sends back.
            </Text>
          </div>
        )}
      </div>
    </Panel>
  );
}
