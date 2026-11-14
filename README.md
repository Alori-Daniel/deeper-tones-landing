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

- **Add a guide:** create the file with `draft: true`, add its slug to exactly one hub in `content/hubs.yaml` (the build fails for a guide in no hub or in two; a hub with 3 or more published guides gets its own page at `/guides/topics/<slug>`), then run `npm run dev`. Files starting with `_` are scratch files and are only built when drafts are shown.
- **Drafts:** a guide with `draft: true` is left out of the build. With `GUIDES_SHOW_DRAFTS=1` set at build time (for preview deploys, or `GUIDES_SHOW_DRAFTS=1 npm run dev` locally) drafts are included with a "Draft, not yet reviewed" banner and `noindex`, and stay out of the sitemap.
- **Go live:** after a human has reviewed a guide, set `draft: false` (and `reviewedBy` if a named professional reviewed it) and deploy. The "Guides" nav link, the `/guides` index and the sitemap entries only appear once a build has at least one guide.

### Figures

A guide can carry up to 3 figures. List them in the frontmatter under `figures` (`id`, `kind` `diagram|study-photo`, `alt`, `caption`, `credit`, `license`, and for study photos `sourceUrl`, `licenseUrl` and optionally `changes`), put the source file at `content/figures-src/<slug>/<id>.(svg|png|jpg|jpeg)`, and place each one in the body on a line of its own: `{{figure:<id>}}`. Diagrams are `Own work`; study photos need an open licence (`CC BY 4.0`/`3.0`/`2.0` or `CC0 1.0`) and a link to the article and the licence. The build fails if a figure is missing its source, is never placed, is placed twice, or a marker has no matching entry.

The same script converts each source to `public/guides/<slug>/<id>.webp` (max 1600 px wide, quality 80, SVG rendered at 2x; skipped when the output is newer than the source). That folder is generated and gitignored; `prebuild` creates it before `next build` copies `public/` into the static assets, and files for guides that are not in the build are removed. Figures are listed as `image` in the guide's Article JSON-LD.

### Telling search engines about changes (IndexNow)

CI runs this after every production deploy (see below); run it by hand only after a manual production deploy (never a preview): `node scripts/indexnow.mjs`. It reads the live sitemap and sends the pages whose `<lastmod>` is today or yesterday to IndexNow, which Bing (and through it ChatGPT and Copilot search), Yandex, Seznam and Naver use to recrawl within minutes. Use `--since 2026-11-01` for an older date, `--all` for every page, and `--dry-run` to see the list without sending. The key file `public/<key>.txt` is public on purpose: it proves we own the host. Google does not use IndexNow; it reads the sitemap in Search Console.

Optional build-time env vars (see `.env.example`): `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, `NEXT_PUBLIC_BING_SITE_VERIFICATION`, `NEXT_PUBLIC_CF_BEACON_TOKEN`, `GUIDES_SHOW_DRAFTS`.

## CI and deploys

Two GitHub Actions workflows, in `.github/workflows/`:

- **`pr.yml`, on every pull request.** These checks are advisory, because main is not protected. Merging deploys production, so don't merge a red PR.
  - **Lint, typecheck, build:** runs on every PR.
  - **Quality (live guides):** `npm run quality` for PRs that touch the site or how it is built and checked: `content/`, `public/`, `src/`, `assets/`, the guide and figure build scripts, `tools/quality/`, `quality/`, `package.json` or the lockfile, `next.config.*`, `open-next.config.*`, `wrangler.jsonc` and `pr.yml` itself. Lighthouse performance is measured up to 3 times and the best score counts, because shared runners are noisy.
  - **Quality (draft guides):** the new-guide checks (`quality/ACCEPTANCE-WAVE.md`, WA1–WA4) for any `draft: true` guide the PR adds or edits. A source URL that is gone fails the job. A site that blocks robots or is briefly down (403/429/5xx) is listed as a warning, to open in a browser.
  - **Preview:** uploads a version of the preview Worker with drafts shown, at `https://pr-<n>-deeper-tones-landing-preview.<subdomain>.workers.dev`, smoke-checks it and posts the link on the PR. It doesn't change the main preview URL.
  - The quality jobs write a summary on the run page (FAIL and WARN lines) and keep their evidence (screenshots, Lighthouse) as artifacts for 14 days.
- **`deploy.yml`, on every push to main (every merge).** It remembers the live version, builds without drafts, deploys deepertones.com, then runs `node scripts/smoke.mjs`. It checks that `/build.txt` names the merged commit, so the new version is the one answering. It also checks the home page, one static asset, `/guides`, one guide, the sitemap and the IndexNow key.
  - If the smoke check passes, it sends the changed pages to IndexNow.
  - If the smoke check fails, it rolls back to the version that was live before (`wrangler rollback`), skips IndexNow and goes red.
  - You can also run it by hand: Actions → Deploy production → Run workflow. It deploys only from main.
  - The Cloudflare token goes only to the steps that call wrangler, never to `npm ci` or the build.
  - Not covered: if the deploy step publishes and then errors, or the job times out, there is no automatic rollback. Run `npx wrangler rollback` by hand.

### One-time setup

Until these exist, the Preview and Deploy jobs go red at their first step. The checks work without them.

1. **Create the Cloudflare API token** (the Cloudflare account owner): dash.cloudflare.com → My Profile → API Tokens → Create Token → the **Edit Cloudflare Workers** template.
   - Account resources: this account only.
   - Zone resources: Specific zone → `deepertones.com`.
   - Copy the token once; it is not shown again.
2. **Find the account ID:** Workers & Pages → Overview, in the right-hand column. Or run `npx wrangler whoami`.
3. **Add them to the repository** (Settings → Secrets and variables → Actions):
   - the token as a **secret** named `CLOUDFLARE_API_TOKEN`;
   - the account ID as a **variable** named `CLOUDFLARE_ACCOUNT_ID`. It is not a credential: it appears in every dashboard URL and grants nothing alone.
4. **Check it:** Actions → Deploy production → Run workflow. A green run means the token works. A deploy error mentioning permissions means the token needs one more permission; add it, then re-run.

Preview URLs are switched on for the preview Worker (`preview_urls` in `wrangler.jsonc`). Manual deploys still work: `GUIDES_REQUIRE_INSHORT=1 npx opennextjs-cloudflare build && npx opennextjs-cloudflare deploy` (add `--env preview` to the deploy for the preview Worker), then `node scripts/indexnow.mjs` after a production deploy.

