"use client";

import { useEffect } from "react";

// One scroll loop for the whole page so sections can stay Server Components.
// - [data-pin]: tall section with a sticky stage. Gets --p (0→1 through the pin) and, if it
//   declares data-stages="n", data-stage (0…n) for CSS to swap content on.
// - [data-track] inside a pin: horizontal track; gets --shift, the px it must travel.
// - [data-speed]: parallax, moves by (distance from viewport centre × speed).
// - [data-tilt]: 3D phone; gets --rx/--ry (degrees) from where it sits in the viewport plus
//   the cursor, around a resting yaw of data-tilt.
// - [data-reveal]: fades up once scrolled into view (stagger with style="--d: 120ms").
// - [data-count]: counts up to its value when its reveal fires.
export function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("motion-ready");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const pins = [...document.querySelectorAll<HTMLElement>("[data-pin]")];
    const layers = [...document.querySelectorAll<HTMLElement>("[data-speed]")];
    const tilts = [...document.querySelectorAll<HTMLElement>("[data-tilt]")];
    const pointer = { x: 0, y: 0 };
    const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

    const measure = () => {
      for (const pin of pins) {
        const track = pin.querySelector<HTMLElement>("[data-track]");
        if (track) pin.style.setProperty("--shift", `${Math.max(0, track.scrollWidth - window.innerWidth)}px`);
      }
    };

    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      for (const pin of pins) {
        const r = pin.getBoundingClientRect();
        const run = r.height - vh;
        const p = run > 0 ? Math.min(1, Math.max(0, -r.top / run)) : 0;
        pin.style.setProperty("--p", p.toFixed(4));
        const stages = Number(pin.dataset.stages);
        if (stages) pin.dataset.stage = String(Math.min(stages, Math.floor(p * (stages + 1))));
      }
      if (reduce) return;
      for (const el of layers) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const offset = r.top + r.height / 2 - vh / 2;
        el.style.translate = `0 ${(offset * Number(el.dataset.speed)).toFixed(1)}px`;
      }
      const vw = window.innerWidth;
      for (const el of tilts) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
        // Off to the right it turns its screen left toward the centre, and vice versa;
        // below the centre it leans back as if seen from above.
        const dx = (r.left + r.width / 2 - vw / 2) / vw;
        const dy = (r.top + r.height / 2 - vh / 2) / vh;
        const ry = clamp(Number(el.dataset.tilt) + dx * 60 + pointer.x * 8, 38);
        const rx = clamp(dy * 18 - pointer.y * 5, 16);
        el.style.setProperty("--ry", ry.toFixed(2));
        el.style.setProperty("--rx", rx.toFixed(2));
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      onScroll();
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    if (!reduce) window.addEventListener("pointermove", onPointer, { passive: true });

    const countUp = (el: HTMLElement) => {
      const to = Number(el.dataset.count);
      if (reduce || !Number.isFinite(to) || to === 0) return;
      const t0 = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / 1200);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 4))));
        if (k < 1) requestAnimationFrame(tick);
      };
      el.textContent = "0";
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.dataset.in = "";
          el.querySelectorAll<HTMLElement>("[data-count]").forEach(countUp);
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      io.disconnect();
    };
  }, []);

  return null;
}
