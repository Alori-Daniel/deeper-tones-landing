This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Guides

Guides live in `content/guides/<slug>.md`: YAML frontmatter (title, description, slug, primaryQuery, dates, `draft`, `reviewedBy`, `readingMinutes`, `sources`, `faq`) and a Markdown body. The slug must equal the file name, and `[1]`, `[2]` in the body cite the `sources` list in order.

`scripts/build-guides.mjs` validates every file and writes `src/content/guides.generated.ts` (gitignored). It runs automatically before `dev`, `build`, `lint` and `typecheck`, so a fresh clone works; run `npm run guides` to run it by hand. A bad file fails the build with a message naming the file and the problem. Guides are rendered to HTML at build time, so nothing reads files at request time on Workers.

- **Add a guide:** create the file with `draft: true`, then run `npm run dev`. Files starting with `_` are scratch files and are only built when drafts are shown.
- **Drafts:** a guide with `draft: true` is left out of the build. With `GUIDES_SHOW_DRAFTS=1` set at build time (for preview deploys, or `GUIDES_SHOW_DRAFTS=1 npm run dev` locally) drafts are included with a "Draft, not yet reviewed" banner and `noindex`, and stay out of the sitemap.
- **Go live:** after a human has reviewed a guide, set `draft: false` (and `reviewedBy` if a named professional reviewed it) and deploy. The "Guides" nav link, the `/guides` index and the sitemap entries only appear once a build has at least one guide.

Optional build-time env vars (see `.env.example`): `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`, `NEXT_PUBLIC_CF_BEACON_TOKEN`, `GUIDES_SHOW_DRAFTS`.
