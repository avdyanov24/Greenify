# Greenify — Design Overhaul + Bug Fix Brief

> Paste this into a fresh Claude Code session opened at the repo root
> (`C:\Users\Alex Dyanov\Desktop\Greenify\Greenify`). It is self-contained but
> leans on `HANDOFF.md` for the exhaustive feature checklist — read that first.

## Your mission

Take the Greenify web app and (1) give every page a cohesive **"Clean Civic"**
visual design, (2) find and fix any bugs you encounter, and (3) end with a short
written review of what changed and the state of each page.

Work in **small, verifiable loops** — design a page, *look at it*, fix it, move on.
Do not try to one-shot the whole app blind.

## Step 0 — Orient before touching anything

1. Read `HANDOFF.md` (live status + the full remaining-work checklist) and `CLAUDE.md`.
2. Skim `client/src/App.tsx` (routes), `client/src/components/ui/*` (the existing
   component kit), `client/tailwind.config.js`, `client/src/index.css`,
   `client/src/utils/store.ts`, and `client/src/services/api.ts`.
3. Note the stack: **React 18 + Vite + TS + Tailwind + Leaflet** (client) /
   **Express + Prisma + SQLite** (server). The README is STALE (it claims
   Postgres/Mapbox/Stripe — ignore that; trust HANDOFF.md and the code).

> **Reality check (current as of this brief):** the app is FURTHER ALONG than
> `HANDOFF.md`'s "remaining" list suggests. The `ui/` kit exists
> (Button, Card, Badge, StatCard, EmptyState, Spinner, Modal, Avatar, Toast, Stars
> + a barrel `index.ts`), all 19 pages exist and call the API, the store auth
> hydration is already implemented (`bootstrap`/`refreshUser` in `store.ts`), the
> Sidebar "Profile" link already uses `/profile/${user.id}`, and `alert()` is
> already replaced by the `Toast` system. So your job is primarily the **visual
> design pass + a bug sweep**, NOT rebuilding pages. Treat `HANDOFF.md`'s checklist
> as historical — verify each item against the code before acting, and do not
> revert working code.

### Hard constraints (these break the build — respect them)
- Server `tsconfig` has `noUnusedLocals` + `noUnusedParameters` **ON** → any unused
  import/var/param fails the build. This is the #1 cause of breakage here.
- After ANY `server/prisma/schema.prisma` change:
  `cd server && npx prisma db push && npx prisma generate`.
- Don't introduce new heavy dependencies without a reason. Prefer Tailwind +
  the existing `ui/` kit + `lucide-react` icons that are already installed.

## Step 1 — Set up a visual feedback loop (do this first)

`playwright` is already in the root devDeps. Stand up a way to actually SEE pages so
you can self-correct instead of designing blind:

1. Start the app: `npm run dev` (server :3000, client :5173). Run it in the
   background and confirm both came up.
2. Write a small throwaway Playwright script (or use the `/run` skill) that logs in
   or registers a demo user, then visits each route and saves a screenshot to a
   scratch folder (gitignored). Registration auto-grants 300 XP (Level 3) so a new
   user can immediately reach most pages.
3. After each page redesign, re-screenshot that route and visually check it before
   moving on. Capture both desktop (~1280px) and mobile (~390px) widths.

If you genuinely cannot drive the browser, fall back to: build the client, fix all
type/build errors, and reason carefully from the JSX — but the screenshot loop is
the whole point, so exhaust that first.

## Step 2 — Establish the "Clean Civic" design system

**Design direction — Clean Civic.** This is a civic/eco platform for a real city
(Burgas). It should feel **calm, trustworthy, and legible — a polished city
dashboard, warmed up by nature**. NOT a playful/gamified candy app.

Principles:
- **Green is an accent, not a flood.** Neutral, airy base (near-white paper +
  slate/stone grays); a deep, muted forest/pine green as the primary brand color.
  **Avoid neon/lime greens and heavy gradients/glassmorphism.**
- **Generous whitespace and a clear type hierarchy.** Let pages breathe.
- **Subtle borders + soft shadows**, modest rounding (~`rounded-lg`/`xl`, ~8–12px).
  Restraint over decoration.
- **Data-dense pages** (Leaderboard, Marketplace, Moderation, Org detail) should
  read like a clean dashboard: aligned tables/cards, quiet dividers, good scan-ability.
- **Make the two currencies legible without being childish:** give GP (Green Points)
  one consistent warm accent (e.g. amber) and XP/level the green — used sparingly as
  small badges/chips, not giant cartoon bars.
- **Accessibility is part of "clean":** WCAG AA contrast, visible focus rings,
  keyboard-navigable, real `<button>`/`<Link>` semantics, alt text.

Current palette (what you're refining): `tailwind.config.js` only extends the
default Tailwind `green` scale (50→900, with `500 #22c55e` / `600 #16a34a`). The app
leans on `green-600` for almost everything, GP is shown in `yellow-600`, and XP in
`blue-600`. For Clean Civic, shift in this direction:
- **Primary green: go deeper.** Drive buttons/links/active states toward `green-700`
  (`#15803d`)/`green-800` (`#166534`) — the brighter `500/600` reads slightly neon.
  Keep the scale; just change which steps you lean on. Optionally add a `brand`
  alias so it's semantic, not raw `green-700` everywhere.
- **Neutrals:** paper background `~#f8faf9`, white cards, borders `~#e5e7eb`,
  text `~#1f2937`, muted text `~#6b7280`. (The current `body` bg `#f9fafb` is fine.)
- **GP/currency accent:** pick ONE amber (`~#d97706`) and use it everywhere GP
  appears, replacing the ad-hoc `yellow-600`.
- **XP/level:** move off `blue-600` (blue fights the civic-green identity) onto the
  green or a calm neutral, so the palette stays coherent.
- **Typography:** load **Inter** for UI/body (add a `@font-face`/CDN `<link>` in
  `index.html` and set it in `index.css` ahead of the system stack); optionally
  **Plus Jakarta Sans** for headings only. Define a clear scale (display / h1 / h2 /
  body / small).
- A consistent spacing rhythm (4px base) and a single shadow scale. Soften the
  Landing page's big solid `green-600` blocks/gradients toward the restrained register.

Then **harden the `ui/` kit** (`client/src/components/ui/` already has Button, Card,
Badge, StatCard, EmptyState, Spinner, Modal, Avatar, Toast, Stars). Make every one
consume the tokens and cover the variants pages actually need (e.g. Button:
primary/secondary/ghost/danger + sizes + loading; Badge: tier/PRO/MAX/status). The
rule for all pages: **compose the `ui/` kit; do not hand-roll one-off Tailwind soup.**

## Step 3 — Redesign every page (one at a time, screenshot each)

Apply the system to all routes. Work page by page; after each, screenshot and verify
desktop + mobile, then continue. Cover (see `App.tsx` for the live list):
Landing, Login, Register, Map, Feed, CreatePost, Profile, EditProfile, Marketplace,
PostTask, Organizations, OrganizationDetail, Vouchers, Subscriptions, Leaderboard,
Achievements, PostDetail, ModerationDashboard, NotFound — plus the shared `Layout`,
`Header`, and `Sidebar`.

For each page: consistent page header + spacing, real empty/loading/error states
(use `EmptyState`/`Spinner`), aligned cards/tables, responsive at 390px, and the
shared nav chrome. Replace any `alert()` calls with the `Toast` system.

## Step 4 — Find and fix bugs

While you're in each page, fix what's actually broken. **Verify before fixing** — the
items `HANDOFF.md` lists as bugs (store hydration, Sidebar profile link, `alert()`
usage) appear ALREADY FIXED in the current code, so don't reintroduce them. Instead,
do a genuine sweep and fix what you find, e.g.:
- **Routing gaps:** confirm every `<Link>`/`navigate` target has a matching route in
  `App.tsx`. Note `App.tsx` currently has NO routes for `/leaderboard`,
  `/achievements`, or `/posts/:id`, yet the Sidebar links to the first two and
  `FeedPage` links posts to `/posts/${id}` — those pages exist
  (`LeaderboardPage`/`AchievementsPage`/`PostDetailPage`) but aren't wired up, so they
  currently 404. Wire them in (inside the protected layout as appropriate).
- **`NotFoundPage`** — verify it uses `<Link>` not `<a href>` (full reload).
- Any **dead buttons**, **bad/missing list keys**, **unhandled promise rejections**,
  **runtime console errors/warnings**, and broken image/empty states.
- Any **`noUnusedLocals`/`noUnusedParameters` build breakers** on the server.

Do a general pass, not just the listed items — click every interactive element and
fix obvious logic bugs you spot.

## Step 5 — Verify (must pass before you call it done)

Run and report the actual output of:
- `npx tsc --noEmit -p server/tsconfig.json`  (server typecheck)
- `npx tsc --noEmit -p client/tsconfig.json`  (client typecheck)
- `npm run build --workspace=client`           (client build)
- `npm run dev` + a click-through of the main flows (auth → feed → create post →
  map → marketplace → profile → leaderboard → moderation), screenshotting each.

Everything must typecheck, build, and run without console errors. If a fix is out of
scope or risky, say so explicitly rather than leaving it silently broken.

## Step 6 — Wrap up

1. Update `HANDOFF.md` to reflect what you finished.
2. Correct the stale `README.md` facts (SQLite not Postgres; Leaflet not Mapbox;
   mock checkout not Stripe; routes that are no longer stubbed).
3. Write a concise **review**: the design direction you applied, per-page before/after
   summary, the bugs you found and fixed, and anything still outstanding.

Keep commits/changes focused and explain your reasoning as you go. Prioritize a
coherent, trustworthy, consistent look over flashy individual pages.
