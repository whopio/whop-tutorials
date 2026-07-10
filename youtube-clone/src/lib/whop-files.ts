import "server-only";
import { whopCompany } from "./whop";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Upload an image to Whop's files endpoint and return its public CDN URL
 * (https://media.whop.com/...). Three steps, mirroring the Whop files API:
 *   1. files.create() → a file record + a presigned S3 upload URL and headers
 *   2. PUT the bytes to that presigned URL (passing the signed headers verbatim)
 *   3. poll files.retrieve() until the file is `ready`, then return its `url`
 *
 * We force `visibility: "public"` so the avatar/banner render in a plain <img>
 * without an auth header. The SDK's convenience `files.upload()` omits
 * visibility, which is why we drive the three calls ourselves.
 */
export async function uploadImageToWhop(file: File): Promise<string> {
  const created = await whopCompany.files.create({
    filename: file.name || "image",
    visibility: "public",
  });

  // Most uploads start as `pending` and need the bytes PUT to S3; a backend may
  // occasionally mark a record `ready` immediately (remote/import flows).
  if (created.upload_status !== "ready") {
    if (!created.upload_url) {
      throw new Error("Whop files: missing upload URL in the create response.");
    }
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(created.upload_headers ?? {})) {
      if (value != null) headers[key] = String(value);
    }
    const res = await fetch(created.upload_url, {
      method: "PUT",
      headers,
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Whop files: upload failed (${res.status} ${res.statusText}).`);
    }
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const current = await whopCompany.files.retrieve(created.id);
    if (current.upload_status === "ready" && current.url) return current.url;
    if (current.upload_status === "failed") {
      throw new Error("Whop files: processing failed.");
    }
    if (Date.now() >= deadline) {
      throw new Error("Whop files: timed out waiting for the file to be ready.");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
