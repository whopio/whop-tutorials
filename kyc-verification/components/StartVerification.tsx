"use client";

import { useState } from "react";
import { Button, Select, Text, TextField } from "@whop/react/components";

// The countries this form offers. The United States sits alongside places where
// the rule does not apply, which is what makes the tax number condition visible.
const VERIFY_COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "br", label: "Brazil" },
  { code: "de", label: "Germany" },
  { code: "tr", label: "Turkey" },
  { code: "ng", label: "Nigeria" },
  { code: "ph", label: "Philippines" },
] as const;

const DEFAULT_COUNTRY = "br";

export interface StartedVerification {
  id: string;
  sessionUrl: string | null;
  status: string;
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <Text size="1" weight="medium" color="gray">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text size="1" color="gray">
          {hint}
        </Text>
      ) : null}
    </label>
  );
}

export function StartVerification({
  accountId,
  defaults,
  onStarted,
  onLog,
}: {
  accountId: string | null;
  defaults: { first: string; last: string };
  onStarted: (started: StartedVerification) => void;
  onLog: (kind: string, detail: string) => void;
}) {
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whop needs a tax number for someone in the United States, and nowhere else
  // in this form does the country change what is required.
  const needsTaxNumber = country.toUpperCase() === "US";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountId) return;
    setError(null);
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      account_id: accountId,
      first_name: String(form.get("first_name")),
      last_name: String(form.get("last_name")),
      date_of_birth: String(form.get("date_of_birth")),
      country,
      tax_identification_number:
        String(form.get("tax_identification_number") || "") || undefined,
      address: {
        line1: String(form.get("line1")),
        city: String(form.get("city")),
        state: String(form.get("state")),
        postal_code: String(form.get("postal_code")),
      },
    };

    onLog("POST", "/api/verification/start");

    const response = await fetch("/api/verification/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(String(data.error));
      onLog("error", String(data.error));
      return;
    }

    onLog("idpf", data.id);
    onStarted(data as StartedVerification);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <TextField.Root size="2" variant="soft">
            <TextField.Input name="first_name" defaultValue={defaults.first} required />
          </TextField.Root>
        </Field>

        <Field label="Last name">
          <TextField.Root size="2" variant="soft">
            <TextField.Input name="last_name" defaultValue={defaults.last} required />
          </TextField.Root>
        </Field>

        <Field label="Date of birth">
          <TextField.Root size="2" variant="soft">
            <TextField.Input
              name="date_of_birth"
              type="date"
              defaultValue="1990-04-12"
              required
            />
          </TextField.Root>
        </Field>

        <Field label="Country">
          <Select.Root size="2" value={country} onValueChange={setCountry}>
            <Select.Trigger variant="soft" color="gray" />
            <Select.Content>
              {VERIFY_COUNTRIES.map((c) => (
                <Select.Item key={c.code} value={c.code}>
                  {c.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field>
      </div>

      <Field
        label="Tax number"
        hint={
          needsTaxNumber
            ? "Whop needs this for someone in the United States. Leave it out and the check still starts and can still be approved, and then the payouts account cannot be created later."
            : undefined
        }
      >
        <TextField.Root size="2" variant="soft">
          <TextField.Input
            name="tax_identification_number"
            required={needsTaxNumber}
            placeholder={needsTaxNumber ? "Required" : "Optional"}
          />
        </TextField.Root>
      </Field>

      <Field label="Address">
        <TextField.Root size="2" variant="soft">
          <TextField.Input name="line1" defaultValue="Rua das Flores 210" required />
        </TextField.Root>
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City">
          <TextField.Root size="2" variant="soft">
            <TextField.Input name="city" defaultValue="Sao Paulo" required />
          </TextField.Root>
        </Field>

        <Field label="State">
          <TextField.Root size="2" variant="soft">
            <TextField.Input name="state" defaultValue="SP" required />
          </TextField.Root>
        </Field>

        <Field label="Postal code">
          <TextField.Root size="2" variant="soft">
            <TextField.Input name="postal_code" defaultValue="01452-000" required />
          </TextField.Root>
        </Field>
      </div>

      {error ? (
        <Text size="1" className="text-[#FA4616]">
          {error}
        </Text>
      ) : null}

      <Button type="submit" size="2" disabled={busy || !accountId} className="self-start">
        {busy ? "Starting" : "Start the check"}
      </Button>
    </form>
  );
}
