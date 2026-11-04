import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const guideImageSize = { width: 1200, height: 630 };

// Same look as src/app/opengraph-image.tsx, with the guide title. Reads the font with fs, which is only
// safe because the image routes are prerendered at build time (generateStaticParams, dynamicParams = false).
export async function guideImage(title: string) {
  const serifBold = await readFile(join(process.cwd(), "assets/SourceSerif4_700Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "linear-gradient(135deg, #0F0F0F 55%, #2B1934 100%)",
          color: "#F1F1F1",
          fontFamily: "Source Serif 4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 40 }}>
          <svg width="52" height="55" viewBox="0 0 35 37" fill="none">
            <path
              d="m33.236 30.55-4.154 4.155m4.153-15.233L18.003 34.704M31.85 9.778 6.925 34.704m12.462-23.542-9.693 9.694m8.308-19.387L0 19.47M5.539 2.853 1.384 7.007"
              stroke="#9D4EDD"
              strokeWidth="2.938"
              strokeLinecap="round"
            />
          </svg>
          Deeper Tones
        </div>
        <div style={{ display: "flex", fontSize: title.length > 44 ? 64 : 76, lineHeight: 1.08, maxWidth: 1000 }}>
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#AFAFAF" }}>Guides: honest skincare for deeper skin tones</div>
      </div>
    ),
    {
      ...guideImageSize,
      fonts: [{ name: "Source Serif 4", data: serifBold, weight: 700, style: "normal" }],
    },
  );
}
