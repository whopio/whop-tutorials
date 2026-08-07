"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Text } from "@whop/react/components";
import { Chip, Panel } from "@/components/Panel";
import { StartVerification, type StartedVerification } from "@/components/StartVerification";
import { DEFAULT_COUNTRY, VERIFY_COUNTRIES, randomPerson } from "@/constants/demo";
import type { VerifiedRecord } from "@/lib/verification-schema";

// What the demo pretends to already have on file. A real app reads this from
// its own database at signup, which is the whole reason it is worth sending.
const ON_FILE = {
  dateOfBirth: "1990-04-12",
  line1: "Rua das Flores 210",
  city: "Sao Paulo",
  state: "SP",
  postalCode: "01452-000",
};

export function StartPanel({
  accountId,
  record,
  onAccountCreated,
  onStarted,
  onLog,
}: {
  accountId: string | null;
  record: VerifiedRecord | null;
  onAccountCreated: (accountId: string) => void;
  onStarted: (started: StartedVerification) => void;
  onLog: (kind: string, detail: string) => void;
}) {
  // Picked after mount so the server and the client agree on the first render.
  const [person, setPerson] = useState<{ first: string; last: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => {
    setPerson(randomPerson());
  }, []);

  // A real app is verifying somebody it already has. This demo has nobody, so
  // it makes a throwaway account the moment the visitor asks to start, rather
  // than on load, so a passing reader costs nothing.
  const ensureAccount = useCallback(async () => {
    if (asked.current || accountId || !person) return;
    asked.current = true;
    onLog("POST", "/api/demo/account");

    const response = await fetch("/api/demo/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ person, country: DEFAULT_COUNTRY }),
    });
    const data = await response.json();

    if (!response.ok) {
      asked.current = false;
      setPendingSubmit(false);
      setError(String(data.error));
      onLog("error", String(data.error));
      return;
    }

    onLog("biz", data.accountId);
    onAccountCreated(data.accountId);
  }, [accountId, person, onAccountCreated, onLog]);

  // The account has to exist before the form can post, so a single press waits
  // for it and then submits the form itself.
  useEffect(() => {
    if (!accountId || !pendingSubmit) return;
    setPendingSubmit(false);
    wrapper.current?.querySelector("form")?.requestSubmit();
  }, [accountId, pendingSubmit]);

  const countryLabel =
    VERIFY_COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY)?.label ?? DEFAULT_COUNTRY;

  if (record) {
    return (
      <Panel
        annotationId="start"
        step={1}
        title="What we already knew about them"
        blurb="Sent as the check was created, so they confirm rather than type."
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Chip label="record" value={record.id} />
            <Chip label="status" value={record.status} />
          </div>
          {record.sessionUrl ? (
            <Text size="1" color="gray" as="p">
              A link to the screen they finish on came back with it. It lasts 7 days.
            </Text>
          ) : (
            <Text size="1" color="gray" as="p">
              No link came back, which means there is nothing left for them to do.
            </Text>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      annotationId="start"
      step={1}
      title="What we already know about them"
      blurb="Our own record of this person. We send it so they do not type it twice."
    >
      <div
        ref={wrapper}
        className="flex flex-col gap-3"
        onFocusCapture={() => void ensureAccount()}
        onPointerDownCapture={() => void ensureAccount()}
      >
        <div className={editing ? "" : "hidden"}>
          <StartVerification
            accountId={accountId}
            defaults={person ?? { first: "Ada", last: "Lovelace" }}
            onStarted={onStarted}
            onLog={onLog}
          />
        </div>

        {!editing ? (
          <>
            <dl className="flex flex-col">
              <Field label="Name" value={person ? `${person.first} ${person.last}` : "..."} />
              <Field label="Date of birth" value={ON_FILE.dateOfBirth} />
              <Field label="Country" value={countryLabel} />
              <Field
                label="Address"
                value={`${ON_FILE.line1}, ${ON_FILE.city} ${ON_FILE.state}, ${ON_FILE.postalCode}`}
              />
            </dl>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!person || pendingSubmit}
                onClick={() => {
                  setPendingSubmit(true);
                  void ensureAccount();
                }}
                className="rounded-lg bg-[#FA4616] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {pendingSubmit ? "Starting" : "Start the check"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  // Somebody opening the form is committed enough. Making the
                  // account now means the submit button is live by the time
                  // they have finished typing.
                  void ensureAccount();
                }}
                className="text-xs text-[#6B6A66] underline underline-offset-2"
              >
                Change these first
              </button>
            </div>

            <Text size="1" color="gray" as="p">
              Whop will ask them for it again on its own screen, because they have to
              answer where we cannot see. What comes back is whatever their document
              says, not what we sent.
            </Text>
          </>
        ) : null}

        {error ? <p className="text-xs text-[#FA4616]">{error}</p> : null}
      </div>
    </Panel>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#E3E2DE] py-2 last:border-0">
      <dt className="text-xs text-[#9A9993]">{label}</dt>
      <dd className="font-mono text-sm text-[#151515]">{value}</dd>
    </div>
  );
}
