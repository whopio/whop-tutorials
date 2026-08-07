"use client";

import { useState } from "react";
import { Button, Select, Text, TextField } from "@whop/react/components";
import type { RequestedItem } from "@/lib/verification-schema";

type Answer = {
  id: string;
  value?: string;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};

const ADDRESS_PARTS = [
  { key: "line1", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postal_code", label: "Postal code" },
  { key: "country", label: "Country" },
] as const;

export function FollowUpForm({
  items,
  onAnswered,
  onLog,
}: {
  items: RequestedItem[];
  onAnswered: (result: { status: string; remaining: number }) => void;
  onLog: (kind: string, detail: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setValue = (id: string, value: string) =>
    setAnswers((current) => ({ ...current, [id]: { id, value } }));

  const setAddress = (id: string, part: string, value: string) =>
    setAnswers((current) => ({
      ...current,
      [id]: {
        id,
        address: {
          line1: "",
          city: "",
          state: "",
          postal_code: "",
          country: "",
          ...current[id]?.address,
          [part]: value,
        },
      },
    }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    onLog("PATCH", "/api/verification/follow-up");

    const response = await fetch("/api/verification/follow-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: Object.values(answers) }),
    });
    const data = await response.json();
    setBusy(false);

    if (!response.ok) {
      setError(String(data.error));
      onLog("error", String(data.error));
      return;
    }

    onLog("status", `${data.status}, ${data.remaining} left`);
    setAnswers({});
    onAnswered(data);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-1.5">
          <Text size="1" weight="medium" color="gray">
            {item.label}
          </Text>
          {item.description ? (
            <Text size="1" color="gray">
              {item.description}
            </Text>
          ) : null}
          {/* Why the last answer was turned down. It belongs above the field it
              is about, not in a banner at the top of the form. */}
          {item.errorMessage ? (
            <Text size="1" className="text-[#FA4616]">
              {item.errorMessage}
            </Text>
          ) : null}

          {item.type === "select" ? (
            <Select.Root
              size="2"
              value={answers[item.id]?.value ?? ""}
              onValueChange={(value) => setValue(item.id, value)}
            >
              <Select.Trigger variant="soft" color="gray" placeholder="Choose one" />
              <Select.Content>
                {item.options.map((option) => (
                  <Select.Item key={option} value={option}>
                    {option}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          ) : item.type === "address" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {ADDRESS_PARTS.map((part) => (
                <label key={part.key} className="flex flex-col gap-1.5">
                  <Text size="1" color="gray">
                    {part.label}
                  </Text>
                  <TextField.Root size="2" variant="soft">
                    <TextField.Input
                      onChange={(e) => setAddress(item.id, part.key, e.target.value)}
                    />
                  </TextField.Root>
                </label>
              ))}
            </div>
          ) : item.type === "files" ? (
            // A document answer needs a file upload, which is a different
            // path. We show what was asked for and stop there.
            <div className="rounded-lg bg-[#F1F1F0] px-3 py-2">
              <Text size="1" color="gray">
                This one wants a document, which needs an upload.
              </Text>
            </div>
          ) : (
            <TextField.Root size="2" variant="soft">
              <TextField.Input
                type={item.type === "date" ? "date" : item.type === "phone" ? "tel" : "text"}
                value={answers[item.id]?.value ?? ""}
                onChange={(e) => setValue(item.id, e.target.value)}
              />
            </TextField.Root>
          )}
        </div>
      ))}

      {error ? (
        <Text size="1" className="text-[#FA4616]">
          {error}
        </Text>
      ) : null}

      <Button
        type="submit"
        size="2"
        disabled={busy || Object.keys(answers).length === 0}
        className="self-start"
      >
        {busy ? "Sending" : "Send the answers"}
      </Button>
    </form>
  );
}
