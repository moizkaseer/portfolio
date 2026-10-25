# Portfolio

Moiz Ali's portfolio — [moizali.tech](https://www.moizali.tech). Next.js 16 (App Router), React 19, TypeScript, content-driven (`content/*.json`, `content/projects/*/index.mdx`).

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` regenerates the content index first (`predev`), then starts `next dev` at `http://localhost:3000`.

## Scripts

- `npm run dev` / `npm run build` / `npm start` — develop / build / run
- `npm run lint` / `npm run typecheck` / `npm test` — ESLint / `tsc --noEmit` / Vitest unit tests
- `npm run test:e2e` — Playwright e2e (`npx playwright test --project=desktop --project=phone`)
- `node scripts/gen-content-index.mjs` — regenerate `lib/content/{slugs,projects}.generated.json` from `content/projects/*/index.mdx` (runs automatically before `dev`/`build`)

## Environment variables

Copy `.env.example` to `.env.local` and fill in what you need — every feature below degrades gracefully without its variables.

| Variable | Used for | Without it |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO (canonical links, sitemap, OG images, JSON-LD). No trailing slash. | Falls back to `https://www.<domain>` from `content/site.json`, then Vercel's production URL, then `http://localhost:3000`. |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console HTML-tag token (just the `content` value). | No tag. Verify by DNS instead, or skip it. |
| `BING_SITE_VERIFICATION` | Bing Webmaster Tools `msvalidate.01` token. | No tag. |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL` | Sending the contact form via [Resend](https://resend.com). | Dev: the message is logged to the console. Production: the form answers 503 and asks the visitor to email directly. |
| `CONTACT_FROM_EMAIL` | The contact email's `From` header (e.g. `"Portfolio <hello@yourdomain.com>"`). | Falls back to `Portfolio <onboarding@resend.dev>` (Resend's test sender). |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Per-IP rate limiting for the agent and contact form via [Upstash Redis](https://upstash.com) (shared across serverless instances). | Falls back to an in-memory limiter (dev / single instance only — doesn't share state across serverless instances). |
| `AGENT_MODEL` | The live agent's model, as `"provider/model"` (e.g. `anthropic/claude-sonnet-5.5`). | The site runs the scripted "demo replay" instead of the live agent. |
| `AGENT_PROVIDER` | `gateway` (default) \| `anthropic` \| `openai` — which provider resolves `AGENT_MODEL`. | Defaults to `gateway` (Vercel AI Gateway). |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key, when `AGENT_PROVIDER=gateway` (default). On Vercel, the platform's own OIDC token (`VERCEL_OIDC_TOKEN`) can be used instead. | The live agent stays off (demo replay). |
| `ANTHROPIC_API_KEY` | Anthropic's own API, when `AGENT_PROVIDER=anthropic` (then `AGENT_MODEL`'s model part is Anthropic's own id). | The live agent stays off (demo replay). |
| `OPENAI_API_KEY` | OpenAI's own API, when `AGENT_PROVIDER=openai`. | The live agent stays off (demo replay). |

The agent's live/demo indicator is never trusted from a prerendered page alone: the client confirms it at runtime against `GET /api/agent/status` (uncached, no secrets), and a live request that fails at runtime falls back to the demo replay gracefully.

## Analytics

Vercel Web Analytics (`@vercel/analytics`) and Speed Insights (`@vercel/speed-insights`) are injected a few seconds after load from `lib/agent/mode.ts` (loaded idle via `components/Boot.tsx` / `components/Deferred.tsx`, so they stay outside the home page's 190KB initial JS budget). Both are cookieless, so no consent banner is needed; the site sets no cookies (theme and session state live in `localStorage` / `sessionStorage`). They only collect data once **Web Analytics** and **Speed Insights** are enabled in the Vercel project dashboard.
