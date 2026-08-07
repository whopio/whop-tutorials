"use client";

import type { VerifiedRecord } from "@/lib/verification-schema";

function Row({
  label,
  value,
  path,
  normalised,
}: {
  label: string;
  value: string | null;
  path: string;
  normalised: string[];
}) {
  const repaired = normalised.includes(path);

  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#E3E2DE] py-2 last:border-0">
      <span className="text-xs text-[#9A9993]">{label}</span>
      <span className="flex items-center gap-1.5 font-mono text-sm">
        {value ?? <span className="text-[#B6B5B0]">not given</span>}
        {repaired ? (
          <span className="text-[#FA4616]" title="Repaired on the way in">
            *
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function VerifiedDetails({ record }: { record: VerifiedRecord }) {
  // Tax numbers, email and phone are never echoed back, so there is no field
  // to render for them and no placeholder either.
  const rows: Array<[string, string | null, string]> = [
    ["First name", record.firstName, "firstName"],
    ["Last name", record.lastName, "lastName"],
    ["Date of birth", record.dateOfBirth, "dateOfBirth"],
    ["Country", record.country, "country"],
    ["Address line 1", record.address.line1, "address.line1"],
    ["City", record.address.city, "address.city"],
    ["State", record.address.state, "address.state"],
    ["Postal code", record.address.postalCode, "address.postalCode"],
    ["Address country", record.address.country, "address.country"],
  ];

  return (
    <div className="flex flex-col">
      {rows.map(([label, value, path]) => (
        <Row
          key={path}
          label={label}
          value={value}
          path={path}
          normalised={record.normalised}
        />
      ))}
      {record.normalised.length > 0 ? (
        <p className="mt-3 text-xs text-[#6B6A66]">
          A star marks a value that arrived in a shape the schema had to repair.
        </p>
      ) : null}
    </div>
  );
}
