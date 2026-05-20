# Podwise

A cross-platform podcast app (iOS, Android, web) built with Expo. Local-only storage in v1 — no auth, no sync.

## Repository

- GitHub: https://github.com/cuppachan/replit-podwise
- Local clone: `~/podwise` (recommended path after initial setup)
- After Replit changes: `git pull` then `./run-local.sh`

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/podcast-app run dev` — run the Expo dev server via bridge wrapper
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, React Native 0.81, expo-router v6
- API: Express 5 (RSS proxy at `/api/rss?url=...`)
- DB: PostgreSQL + Drizzle ORM (not used in v1)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/podcast-app/` — Expo mobile app (Podwise)
  - `app/` — expo-router screens
  - `app/(tabs)/` — Inbox, Discover, Library tabs
  - `app/podcast/[id].tsx` — podcast detail with episode list
  - `app/episode/[id].tsx` — episode detail screen
  - `components/` — EpisodeCard, PodcastCard, ErrorBoundary
  - `context/PodcastContext.tsx` — central state (subscriptions, inbox, OPML import)
  - `services/itunesApi.ts` — iTunes search API
  - `services/rssFetcher.ts` — RSS feed fetch via API proxy + XML parsing
  - `services/opmlParser.ts` — OPML XML parser
  - `constants/colors.ts` — dark/light theme tokens
  - `hooks/useColors.ts` — always returns dark palette (dark-first app)
  - `scripts/dev.js` — dev server bridge: binds PORT immediately, runs Expo on PORT+1
- `artifacts/api-server/src/routes/rss.ts` — RSS proxy route

## Architecture decisions

- **RSS proxy through API server**: RSS feeds can't be fetched from the browser directly due to CORS. The API server proxies them at `GET /api/rss?url=...`.
- **Dev bridge script** (`scripts/dev.js`): Expo's web dev server binds its port lazily (on first browser connection). The bridge immediately binds `PORT` with a Node.js HTTP proxy server and runs Expo on `PORT+1`, so the Replit workflow system detects the port and marks the workflow as running.
- **Dark-only theme**: `useColors()` always returns `colors.dark`. `Appearance.setColorScheme` is not available on web, so we skip OS detection entirely.
- **Local-only v1**: AsyncStorage for all persistence. No auth, no sync.
- **iTunes Search API**: Used for podcast discovery. Podcast Index planned for v2 (requires HMAC-SHA1 auth).

## Product

- **Inbox** — latest episodes from subscribed podcasts, pulled from RSS feeds
- **Discover** — search podcasts via iTunes Search API
- **Library** — manage subscriptions; OPML import to migrate from other apps

## User preferences

- Dark-first design (bg: `#0e0c0a`, primary: `#e85d04`, radius: 12)
- Inter font (400/500/600/700)
- Local-only storage in v1 — no auth/sync

## Gotchas

- **Do not run `pnpm exec expo start` directly** — env vars (PORT, EXPO_PACKAGER_PROXY_URL, etc.) are only injected via the workflow.
- **Dev bridge**: Expo runs on `PORT+1` (23711), not `PORT` (23710). The bridge proxies web requests. Mobile (QR code / Expo Go) connects via `$REPLIT_EXPO_DEV_DOMAIN` which routes to Expo's own port directly.
- **RSS fetch on web**: goes through API server proxy. URL: `https://$EXPO_PUBLIC_DOMAIN/api/rss?url=...`
- `useColors` ignores OS color scheme and always returns dark palette.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-on-Replit guidelines
