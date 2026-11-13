import Link from "next/link";
import { guidePath, guideThumb, shortDate, type Guide } from "@/lib/guides";

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

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .join("")
    .toUpperCase();

// "Reviewed by ..." with the date, reading time and source count (replaces the old single grey meta line).
export function ReviewerCard({ guide }: { guide: Guide }) {
  return (
    <div className="reviewer-card">
      <span className="reviewer-disc" aria-hidden>
        {guide.reviewedBy ? initials(guide.reviewedBy) : "–"}
      </span>
      <div>
        <p className="reviewer-name">
          {guide.reviewedBy ? (
            <>
              Reviewed by {guide.reviewedBy}
              {guide.reviewerRole && <span className="reviewer-role">, {guide.reviewerRole}</span>}
            </>
          ) : (
            "Not yet reviewed"
          )}
        </p>
        <p className="reviewer-meta">
          <span>
            Updated <time dateTime={guide.updated}>{guide.updatedLabel}</time>
          </span>
          {" · "}
          <span>{guide.readingMinutes} min read</span>
          {" · "}
          <span>
            {guide.sourceCount} {guide.sourceCount === 1 ? "source" : "sources"}
          </span>
        </p>
      </div>
    </div>
  );
}

// The answer first: 3 or 4 plain lines, no links or citations (the body carries those).
export function InShort({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="in-short" aria-label="In short">
      <p className="ui-label">In short</p>
      <ul>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </section>
  );
}

export type TocItem = { id: string; text: string };

// Phone and tablet contents: a closed <details> right after "In short".
export function TocDetails({ items }: { items: TocItem[] }) {
  return (
    <details className="toc-mobile">
      <summary className="chevron">
        On this page <span className="toc-count">· {items.length} sections</span>
      </summary>
      <nav aria-label="On this page">
        <ol>
          {items.map((i) => (
            <li key={i.id}>
              <a href={`#${i.id}`}>{i.text}</a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

// Card used in the /guides index and hub pages (variant "index": a row on phones) and in "Related guides".
// The thumbnail is the first diagram without its own title, so a card never shows two headlines.
export function GuideCard({
  guide,
  variant = "related",
  as: Heading = "h3",
  eager = false,
}: {
  guide: Guide;
  variant?: "index" | "related";
  as?: "h2" | "h3";
  eager?: boolean;
}) {
  const thumb = guideThumb(guide);
  return (
    <Link
      href={guidePath(guide.slug)}
      className="g-card group"
      data-variant={variant}
    >
      {thumb && (
        <div className="g-thumb">
          {/* Static WebP built from content/figures-src at build time. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb.src}
            width={thumb.width}
            height={thumb.height}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        </div>
      )}
      <div className="g-body">
        {guide.draft && <span className="g-draft">Draft</span>}
        <Heading className="g-title">{guide.title}</Heading>
        {variant === "index" && <p className="g-desc">{guide.description}</p>}
        <p className="g-meta">
          <span>{guide.readingMinutes} min read</span>
          {variant === "index" && (
            <>
              {" · "}
              <span>Updated {shortDate(guide.updated)}</span>
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
