import Link from "next/link";
import { guidePath, type Guide } from "@/lib/guides";

export function DraftBanner() {
  return (
    <p
      role="note"
      className="mb-6 rounded-[10px] border border-caution/40 bg-caution/10 px-4 py-3 text-sm font-medium text-foreground"
    >
      Draft, not yet reviewed. This page is hidden from search engines.
    </p>
  );
}

export function GuideMeta({ guide }: { guide: Guide }) {
  return (
    <p className="mt-4 text-sm text-subtle">
      Updated <time dateTime={guide.updated}>{guide.updatedLabel}</time> · {guide.readingMinutes} min read
      {guide.reviewedBy && <> · Reviewed by {guide.reviewedBy}</>}
    </p>
  );
}

// Card used in the index and in "Related guides".
export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link
      href={guidePath(guide.slug)}
      className="group flex h-full flex-col rounded-[14px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.18)] transition hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_14px_30px_-12px_rgba(0,0,0,0.28)] sm:p-6"
    >
      {guide.draft && (
        <span className="mb-2 w-fit rounded-full bg-caution/15 px-2.5 py-0.5 text-xs font-medium">Draft</span>
      )}
      <h3 className="font-display text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-balance group-hover:text-primary">
        {guide.title}
      </h3>
      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{guide.description}</p>
      <p className="mt-4 text-sm text-subtle">
        Updated {guide.updatedLabel} · {guide.readingMinutes} min read
      </p>
    </Link>
  );
}
