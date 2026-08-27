import type { Application } from "@/lib/formation/schema";

// Everything below was sent to the sandbox and came back accepted. Whop does
// not check any of it, so the state does, weeks later, after the customer has
// already paid. An integration that leans on the API as its only validator
// ships these straight through.
export interface UncheckedFinding {
  field: string;
  value: string;
  detail: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const E164 = /^\+[1-9]\d{7,14}$/;
const US_ZIP = /^\d{5}(-\d{4})?$/;

export function findUnchecked(app: Application): UncheckedFinding[] {
  const findings: UncheckedFinding[] = [];

  app.founders.forEach((founder, index) => {
    const who = `Founder ${index + 1}`;

    if (founder.email && !EMAIL.test(founder.email)) {
      findings.push({
        field: `${who} email`,
        value: founder.email,
        detail: "Not a valid address, so the filing confirmation goes nowhere.",
      });
    }

    if (founder.phone && !E164.test(founder.phone)) {
      findings.push({
        field: `${who} phone`,
        value: founder.phone,
        detail: "The docs ask for E.164, like +12125550100.",
      });
    }

    if (founder.date_of_birth) {
      const age = yearsSince(founder.date_of_birth);
      if (age === null) {
        findings.push({
          field: `${who} date of birth`,
          value: founder.date_of_birth,
          detail: "Not a date the state will be able to read.",
        });
      } else if (age < 18) {
        findings.push({
          field: `${who} date of birth`,
          value: `${founder.date_of_birth} (age ${age})`,
          detail: "No state registers a minor as the responsible party.",
        });
      }
    } else {
      findings.push({
        field: `${who} date of birth`,
        value: "not sent",
        detail: "Optional on the endpoint, and needed by the state later.",
      });
    }

    if (
      founder.address.country.toUpperCase() === "US" &&
      founder.address.postal_code &&
      !US_ZIP.test(founder.address.postal_code)
    ) {
      findings.push({
        field: `${who} ZIP code`,
        value: founder.address.postal_code,
        detail: "Not a US ZIP, so the state will reject the filing.",
      });
    }
  });

  const bare = app.business_name.trim();
  if (bare.length < 3) {
    findings.push({
      field: "Business name",
      value: bare || "(empty)",
      detail: "A name that is only the entity ending will be rejected by the state.",
    });
  }

  return findings;
}

function yearsSince(iso: string): number | null {
  const born = new Date(iso);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}
