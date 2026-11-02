"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "done" | "error";

export function WaitlistForm({ id }: { id?: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");

    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      form.reset();
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("We couldn't reach the server. Check your connection and try again.");
    }
  }

  if (status === "done") {
    return (
      <p role="status" className="rounded-[10px] border border-success/40 bg-success/10 px-5 py-4 text-sm">
        You&apos;re on the list. We&apos;ll email you when Deeper Tones is ready to download.
      </p>
    );
  }

  return (
    <form id={id} onSubmit={onSubmit} className="w-full max-w-md">
      <label htmlFor={`${id ?? "waitlist"}-email`} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={`${id ?? "waitlist"}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="Your email address"
          className="h-12 w-full rounded-[10px] border border-black/10 bg-white px-4 text-base text-foreground placeholder:text-subtle focus:border-primary focus:outline-none sm:flex-1"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="flex h-12 items-center justify-center gap-2 rounded-[10px] bg-foreground px-5 text-[15px] font-medium text-background transition hover:bg-primary disabled:opacity-60"
        >
          {status === "submitting" ? "Joining…" : "Get early access"}
          <span aria-hidden>→</span>
        </button>
      </div>
      <p className={`mt-3 text-xs ${status === "error" ? "text-danger" : "text-subtle"}`} aria-live="polite">
        {status === "error" ? message : "One email when the app is ready. No spam, unsubscribe any time."}
      </p>
    </form>
  );
}
