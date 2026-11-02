import { NextResponse } from "next/server";

// Adds an early-access email to Resend Contacts.
// Env: RESEND_API_KEY (required), RESEND_SEGMENT_ID (optional, to group waitlist contacts).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
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
  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      unsubscribed: false,
      ...(segmentId && { segments: [{ id: segmentId }] }),
    }),
  });

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
