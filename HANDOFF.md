# Greenify — Work Handoff

> Status note for continuing the task: **"Enhance and improve the design of every page,
> make sure everything works, add things missing from the plan, then give a review."**
> The full product plan is in the original prompt / README. This file tracks progress.

## 2026-05-30 — "Clean Civic" design pass + bug sweep (latest)
- **Design system established.** Inter (UI/body) + Plus Jakarta Sans (headings) loaded in `index.html`,
  wired through `index.css` + `tailwind.config.js` (new `brand` deep-green scale, `gp` amber token,
  `card` shadow, `fontFamily`). Paper background `#f8faf9`, global `:focus-visible` ring for a11y.
- **Shared UI kit retuned to Clean Civic** (propagates to every page that composes it): `Button`
  (primary now deep `green-700/800` + focus ring), `Badge` (new `amber` colour; `yellow`→amber so all GP
  badges read amber), `Spinner` (green-700).
- **Chrome + key pages restyled**: Header (XP→green, GP→amber, display font), Sidebar (white bg, calm
  green active state), Layout (paper bg), Landing/Login/Register (deeper CTAs, softened green panels),
  Profile (amber GP / green stats, Spinner loading state), Map/Feed/CreatePost/Subscriptions/NotFound/
  Achievements (deepened greens, amber GP).
- **Bugs fixed**: `App.tsx` was missing routes for `/leaderboard`, `/achievements`, `/posts/:postId`
  (Sidebar + Feed linked to them → 404). Now wired inside the protected layout. `PostDetailPage` uses
  `useParams().postId` so the new `/posts/:postId` matches.
- **"Profile button" root cause**: source was already correct (`/profile/${user.id}` + `/profile/:userId`
  route); the single-process `:3000` server was serving a STALE pre-fix `client/dist`. Fixed by rebuilding
  the client. (Verified false-alarm: CreatePost rewards — `posts.ts` *does* return `gpEarned/xpEarned/isDuplicate`.)
- **Verified**: `tsc --noEmit` passes for BOTH client and server; client production build regenerated.

## Project shape
- Monorepo at `C:\Users\Alex Dyanov\Desktop\Greenify\Greenify`. Workspaces: `client`, `server`, `shared`.
- **client**: React 18 + Vite + TypeScript + Tailwind + **Leaflet** (react-leaflet, NOT Mapbox — README is wrong) + h3-js + Zustand + lucide-react.
- **server**: Express 4 + TypeScript (ESM, run via `tsx`) + Prisma + **SQLite** (`server/prisma/dev.db`, NOT Postgres — README is wrong). JWT auth, bcryptjs.
- Run everything: `npm run dev` (root) → server on :3000, client on :5173. Vite proxies `/api` and `/uploads` to :3000.
- `client/.env` sets `VITE_API_URL=http://localhost:3000/api`; `server/.env` has working SQLite + JWT secret.
- **Registration auto-grants 300 XP = Level 3** (intentional, so new users can post immediately in the demo).

## ⚠️ Gotchas (read before editing)
- Server `tsconfig.json` has **`noUnusedLocals` + `noUnusedParameters` ON** → unused imports/vars **fail the build**. This is the #1 cause of breakage here.
- After any `schema.prisma` change: `cd server && npx prisma db push && npx prisma generate`. Client generates to root `node_modules/@prisma/client`.
- `apiClient.request()` throws `Error(body.error)` on non-2xx; pages catch and show `err.message`.
- Image URLs are relative `/uploads/xxx.jpg` served by Express static; they work through the Vite proxy.

## Verify commands
- Server typecheck: `npx tsc --noEmit -p server/tsconfig.json`
- Client typecheck: `npx tsc --noEmit -p client/tsconfig.json`
- Client build: `npm run build --workspace=client`
- Then run `npm run dev` and click through flows (consider the `/run` skill or Playwright).

---

## ✅ DONE so far (all backend; compiles clean except dead `imageHash.ts`)

1. **Installed** `@types/cors`, `@types/bcryptjs` in server (fixed original compile errors).
2. **schema.prisma**: added `User.role` (`user`/`moderator`/`admin`), `User.isBanned`, `User.bioForHire`, follow relations (`following`/`followers`), and a new **`Follow`** model. Pushed + generated; DB in sync.
3. **NEW `server/src/utils/progression.ts`**: `computeLevel`, `LEVEL_THRESHOLDS`, `grantRewards()` (applies **MAX subscription 1.5× multiplier**), `unlockAchievement()`, `recomputeAverageRating()`. This centralizes logic that was duplicated.
4. **posts.ts**: refactored to use `grantRewards`/`unlockAchievement`; removed dup `computeLevel` and unused `getNeighboringHexes` import. Flagged posts now earn **no** rewards until approved. Response includes `leveledUp`/`newLevel`.
5. **endorsements.ts**: uses `grantRewards`; removed dup `computeLevel`; added **"endorser"** achievement (20 endorsements).
6. **marketplace.ts** (full rewrite): task list (boosted-first + `applicationCount`), post task (**Level 3 gate** + GP-balance check), task detail, **`/my-tasks`**, applications (**1+ approved-post gate**, dup/own-task checks), accept (locks budget to `proposedGP`, auto-rejects others), complete (**GP transfer + worker XP + optional review + trusted-worker achievement**), separate **`/tasks/:id/review`** (48h edit window), **`/reviews/user/:id`**, **`/workers`** directory (PRO/MAX boosted, rating-sorted). Reviews → `recomputeAverageRating` (worker star ratings now actually work).
7. **subscriptions.ts** (full rewrite): **mock checkout, no Stripe** (per MVP). `GET /me`, `POST /` (pro/max upsert, 30-day period), `POST /me/cancel` (delete), webhook stub. `PLAN_PRICES` pro=4.99, max=9.99.
8. **boosts.ts** (full rewrite): **mock €2/week**. `GET /active`, `POST /` (ownership check, 7-day expiry), `GET /:boostId`.
9. **organizations.ts** (full rewrite): **Level 5 gate** to create + **org-founder achievement** + **hex territory merge**; `GET /` (memberCount/hexCount); `GET /:orgId` (members with `contributionScore = posts*3 + endorsementsReceived`, `totalPlants`); `PATCH` (leader-only settings incl. distribution modes); `join` (merges hexes into blob); `leave`; remove-member (leader-only).

---

## 🔲 REMAINING

### Backend
- [ ] **admin.ts**: add `requireRole("moderator"|"admin")` gate (currently any logged-in user can moderate). Add **ban-user** endpoint (set `isBanned`). Plan wants moderator-only + ban controls.
- [ ] **profile.ts**: implement **follow/unfollow** for real (Follow model exists) — currently no-op stubs. Add follower/following counts + `isFollowing` to profile responses. Add `bioForHire` to the PATCH update fields.
- [ ] **Leaderboard endpoint** (e.g. `/api/profile/leaderboard` or new route): top users by GP / hexes / XP.
- [ ] **Seed data** in `index.ts` (alongside existing `seedAchievements`): `seedVouchers()` (store is empty otherwise), a **demo admin** account (for moderation, role=admin), a **Level-5 founder + demo organization** (so orgs are demoable despite the L5 gate), and ideally some **demo posts/hexes around Burgas** so map/feed look alive. Document seeded credentials.
- [ ] **imageHash.ts**: dead stub causing the only typecheck errors — delete it or prefix params with `_` and wire it into posts.ts as the real pHash (currently posts.ts uses an inline sha256 of first 500 chars).
- [ ] Decide on **Burgas geofence** in `validation.ts` — currently only warns; plan wants server-side enforcement (keep relaxed for demo but note it).

### Frontend infra (do FIRST — unblocks everything)
- [ ] **store.ts**: `user` is `null` after refresh even with a valid token → header shows nothing, self-endorse/ownership checks break app-wide. **Bootstrap**: on app load if token exists, call `getMyProfile()` → `setUser`. Handle 401 → `logout`. Add a `refreshUser()` helper (call after post/endorse/subscribe/redeem to keep GP/level live).
- [ ] **api.ts**: add methods for all new endpoints: `getMyTasks`, `getTask`, `getWorkers`, `getUserReviews`, `submitReview`, `completeTask`, `acceptApplication`, `getMySubscription`, `subscribe`, `cancelSubscription`, `createBoost`, `getActiveBoosts`, org `createOrganization`(+mode/cut)/`joinOrg`/`leaveOrg`/`updateOrg`/`removeMember`, `followUser`/`unfollowUser`, `getLeaderboard`, `banUser`, `getAdminUsers`. (`updateProfile` needs `bioForHire`.)

### Frontend pages — still TODO stubs that DON'T call the API
- [ ] **EditProfilePage** — prefill from `getMyProfile`, save `displayName`/`bio`/`bioForHire`/`availableForHire`.
- [ ] **MarketplacePage** — tabs: Open Tasks / Workers / My Tasks. Apply modal with GP negotiation; manage applications (accept); mark complete + leave review modal; boosted badges.
- [ ] **PostTaskPage** — wire `createTask`, validate, redirect.
- [ ] **OrganizationsPage** — fetch list; Create modal (name/desc/distribution mode/leader cut); cards → detail.
- [ ] **OrganizationDetailPage** — fetch; territory/plant stats; member leaderboard table; join/leave; leader settings panel (distribution mode + remove members).
- [ ] **VouchersPage** — fetch vouchers + my-vouchers; redeem with confirm + GP check; show redeemed codes.
- [ ] **SubscriptionsPage** — replace €X/€XX with real prices; fetch current sub; subscribe/cancel; highlight current; refresh user.
- [ ] **ModerationDashboard** — fetch `/admin/stats` + queue; approve/reject; ban; role-gate visibility.
- [ ] **NotFoundPage** — swap `<a href>` for `<Link>` (avoids full reload).

### Frontend pages — built but need polish/features
- [ ] **FeedPage** — Comment button is dead (add comments expand using existing `/posts/:id/comments`); add Report; optional boost-my-post; replace `alert()` with toast.
- [ ] **Sidebar** — "Profile" links to `/profile` (no userId) → **broken**; use `/profile/${user.id}`. Add Leaderboard link; hide Moderation unless admin/mod; show PRO/MAX badge.
- [ ] **Header** — add XP display; profile link depends on store hydration fix.
- [ ] **MapPage** (works) — optional: org-colored blobs, better hex detail panel.
- [ ] **LandingPage** (good) — optional: live stats, nicer sponsor tiles.

### Design system (the "improve design of every page" ask — not started)
- [ ] Create `client/src/components/ui/`: `Button`, `Card`, `Badge`, `StatCard`, `EmptyState`, `Spinner`, `Modal`, `Avatar`, and a `Toast` system to replace `alert()`. Currently every page hand-rolls Tailwind. Keep the existing green palette (tailwind.config.js extends `green`).

### New pages worth adding (from plan, "things missing")
- [ ] **LeaderboardPage**, **AchievementsPage** (gallery w/ locked+unlocked; profile only shows unlocked), **PostDetailPage** (all 3 photos + comments + endorsers).

### Finally
- [ ] **Update README** (claims Postgres + Mapbox; actually SQLite + Leaflet; many routes no longer "stubbed").
- [ ] **Write the review** the user asked for (summary of everything changed + state of each page/feature).

## Suggested order for next session
1. Fix `store.ts` hydration + extend `api.ts` (unblocks all pages).
2. Build the UI component kit.
3. Backend leftovers: profile follow + leaderboard, admin role-gate + ban, **seed data** (do this early so pages have content to show).
4. Implement the stub pages one by one (Vouchers/Subscriptions/Marketplace/PostTask/Orgs/OrgDetail/Moderation/EditProfile).
5. Polish Feed/Sidebar/Header; fix NotFound.
6. Add Leaderboard/Achievements/PostDetail pages.
7. Typecheck both, client build, run app, click through.
8. Update README + write the review.
