"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "./GuideBits";

// Desktop "On this page" rail. Plain links without JavaScript; with it, the section being read is marked.
export function GuideTocRail({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;
    let frame = 0;
    // The current section is the last heading that has reached the reading line (just under the header).
    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const t of targets) if (t.getBoundingClientRect().top <= 140) current = t.id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <nav className="toc-rail" aria-label="On this page">
      <p className="toc-label">On this page</p>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? "true" : undefined}>
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
