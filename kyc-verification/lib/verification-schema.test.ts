import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVerification } from "./verification-schema.ts";

// The shape a live approved record actually came back as on 2026-07-29. Every
// oddity below was observed together on one record.
const REAL_APPROVED = {
  id: "idpf_8vXp4ZNDawOXW",
  kind: "individual",
  status: "approved",
  first_name: "Ada",
  last_name: "Lovelace",
  date_of_birth: "1815-12-10",
  country: "TR",
  address: {
    line1: "",
    line2: "",
    state: "null",
    country: "TUR",
  },
  requested_information: [],
  created_at: "2026-07-29T15:20:46+02:00",
  updated_at: "2026-07-29T15:44:02+02:00",
};

const DOCS_CLEAN = {
  id: "idpf_cleanexample",
  kind: "individual",
  status: "pending",
  first_name: "Grace",
  last_name: "Hopper",
  date_of_birth: "1906-12-09",
  country: "US",
  address: {
    line1: "1 Main Street",
    line2: null,
    city: "Arlington",
    state: "VA",
    postal_code: "22201",
    country: "US",
  },
  session_url: "https://example.com/session",
  requested_information: [],
  created_at: "2026-07-29T15:20:46Z",
  updated_at: "2026-07-29T15:20:46Z",
};

test("parses a real approved record without throwing", () => {
  const record = parseVerification(REAL_APPROVED);
  assert.equal(record.id, "idpf_8vXp4ZNDawOXW");
  assert.equal(record.status, "approved");
});

test("turns an empty string address line into null and records it", () => {
  const record = parseVerification(REAL_APPROVED);
  assert.equal(record.address.line1, null);
  assert.ok(record.normalised.includes("address.line1"));
});

test("turns the literal string null into null and records it", () => {
  const record = parseVerification(REAL_APPROVED);
  assert.equal(record.address.state, null);
  assert.ok(record.normalised.includes("address.state"));
});

test("shortens a three letter address country and records it", () => {
  const record = parseVerification(REAL_APPROVED);
  assert.equal(record.address.country, "TR");
  assert.ok(record.normalised.includes("address.country"));
});

test("treats a missing city as absent rather than repaired", () => {
  const record = parseVerification(REAL_APPROVED);
  assert.equal(record.address.city, null);
  assert.equal(record.address.postalCode, null);
  assert.ok(!record.normalised.includes("address.city"));
  assert.ok(!record.normalised.includes("address.postalCode"));
});

test("accepts an offset timestamp and a Z timestamp alike", () => {
  assert.equal(parseVerification(REAL_APPROVED).createdAt, "2026-07-29T15:20:46+02:00");
  assert.equal(parseVerification(DOCS_CLEAN).createdAt, "2026-07-29T15:20:46Z");
});

test("reports nothing normalised for a clean record", () => {
  const record = parseVerification(DOCS_CLEAN);
  assert.deepEqual(record.normalised, []);
  assert.equal(record.sessionUrl, "https://example.com/session");
});

test("treats an absent session_url as a state and not an error", () => {
  const record = parseVerification(REAL_APPROVED);
  assert.equal(record.sessionUrl, null);
});

test("maps a follow-up item into camel case and defaults its options", () => {
  const record = parseVerification({
    ...DOCS_CLEAN,
    status: "action_required",
    requested_information: [
      {
        id: "inrqi_abc123",
        field: "occupation",
        type: "text",
        label: "Occupation",
        description: null,
        options: [],
        error_message: "That value was not accepted",
      },
    ],
  });
  assert.equal(record.requestedInformation.length, 1);
  assert.equal(record.requestedInformation[0].id, "inrqi_abc123");
  assert.equal(record.requestedInformation[0].errorMessage, "That value was not accepted");
  assert.deepEqual(record.requestedInformation[0].options, []);
});
