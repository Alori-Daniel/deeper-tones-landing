import { NextResponse } from "next/server";
import { sanitizeUtm } from "@/lib/utm";

// Adds an early-access email to Resend Contacts, with the UTM source as contact properties.
// Env: RESEND_API_KEY (required), RESEND_SEGMENT_ID (optional, to group waitlist contacts).
// Properties utm_source / utm_campaign / utm_medium must exist in Resend (Audience > Properties).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email: unknown;
  let utm: unknown;
  try {
    ({ email, utm } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[waitlist] RESEND_API_KEY is not set");
    return NextResponse.json(
      { ok: false, error: "Sign-ups aren't open just yet. Please try again soon." },
      { status: 503 },
    );
  }

  const segmentId = process.env.RESEND_SEGMENT_ID;
  const contactEmail = email.trim().toLowerCase();
  const properties = sanitizeUtm(utm);
  const createContact = (withProperties: boolean) =>
    fetch("https://api.resend.com/contacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: contactEmail,
        unsubscribed: false,
        ...(segmentId && { segments: [{ id: segmentId }] }),
        ...(withProperties && { properties }),
      }),
    });

  let res = await createContact(Object.keys(properties).length > 0);

  // Resend rejects a contact whose property key hasn't been created in the dashboard. Counting the
  // source is never worth losing the sign-up, so try once more without it.
  if (!res.ok && res.status !== 409 && res.status !== 429 && Object.keys(properties).length > 0) {
    console.error("[waitlist] Resend error with UTM properties, retrying without", res.status, await res.text());
    res = await createContact(false);
  }

  // Treat "already exists" as success so people can't probe who signed up.
  if (res.ok || res.status === 409) {
    return NextResponse.json({ ok: true });
  }

  console.error("[waitlist] Resend error", res.status, await res.text());
  return NextResponse.json(
    { ok: false, error: "Something went wrong on our side. Please try again." },
    { status: 502 },
  );
}
