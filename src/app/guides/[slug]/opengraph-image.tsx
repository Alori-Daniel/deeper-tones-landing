import { notFound } from "next/navigation";
import { guideImage, guideImageSize } from "@/lib/guide-og";
import { allGuides, getGuide } from "@/lib/guides";

export const alt = "Deeper Tones guide";
export const size = guideImageSize;
export const contentType = "image/png";
// Prerendered at build time only: guideImage reads a font with fs, which does not exist on Workers.
export const dynamicParams = false;

export function generateStaticParams() {
  return allGuides.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  return guideImage(guide.title);
}
