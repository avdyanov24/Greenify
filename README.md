# Greenify — Civic Eco-Platform for Burgas

A web-based platform where users document tree plantings with 3-photo verification, claim hexagonal territories on an interactive map, earn rewards, and participate in community-driven eco-projects.

## Project Overview

**Greenify** is an MVP civic eco-platform built for Burgas, Bulgaria. Users plant trees/flowers/grass, document with GPS-locked 3-photo posts, claim hexagonal hex territories on a live map, earn Green Points (GP) and XP through a two-currency system, and hire each other for gardening tasks via a marketplace.

### Key Features

- **Hex Map**: Interactive map of Burgas overlaid with H3 hexagons (~50m² each). Each verified post claims one hex.
- **3-Photo Verification**: Plant documentation with seed/placement/buried photos to prevent fraud.
- **Two-Currency System**:
  - **XP** — earned through engagement, used for leveling.
  - **Green Points (GP)** — spendable currency for marketplace tasks and voucher redemption.
- **Endorsements**: Users recommend posts; each endorsement grants bonus hexes (max 5 per post).
- **Marketplace**: Two-sided work platform for garden tasks (watering, weeding, pruning, etc.). Workers apply, negotiate rates in GP, get rated.
- **Organizations**: Teams can merge their hexes into shared territories with customizable GP distribution (equal, leader cut, or contribution-weighted).
- **Achievements**: Unlock badges (First Plant, Canopy Starter, Trusted Worker, etc.).
- **Subscriptions**: PRO (auto-promote posts, +profile visibility) and MAX (+1.5× XP/GP multipliers, exclusive badge).
- **One-Time Boosts**: €2/week to promote a single post.
- **Voucher Store**: Redeem GP for charity/partner benefits (eco-friendly businesses).
- **Moderation Dashboard**: Admin tools for reviewing flagged posts and managing users.

---

## Tech Stack

### Frontend

- **React** 18 with **Vite** (dev server, HMR, fast build)
- **React Router** 6 for client-side routing
- **Mapbox GL JS** for interactive hex map rendering
- **Uber H3-js** for hexagonal grid calculations
- **Zustand** for global state management (auth, user profile)
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend

- **Node.js** + **Express** 4 (REST API)
- **TypeScript** for type safety
- **Prisma** as ORM with **PostgreSQL**
- **JWT** for stateless authentication
- **bcryptjs** for password hashing
- **Stripe** for subscription & one-time payment processing
- **AWS SDK v3** (S3-compatible API) for Cloudflare R2 image storage

### Infrastructure & Services

- **PostgreSQL** — relational database
- **Cloudflare R2** — S3-compatible object storage for images
- **Stripe** — payments & subscriptions
- **JWT + optional Google OAuth** — authentication

### Monorepo Structure

```
/client        → React + Vite frontend
/server        → Node.js + Express backend
/shared        → Shared TypeScript types (if needed)
```

---

## Project Structure

```
Greenify/
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── pages/                   # Page components (one per screen)
│   │   │   ├── LandingPage.tsx
│   │   │   ├── MapPage.tsx
│   │   │   ├── FeedPage.tsx
│   │   │   ├── CreatePostPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   ├── OrganizationsPage.tsx
│   │   │   ├── MarketplacePage.tsx
│   │   │   ├── VouchersPage.tsx
│   │   │   ├── SubscriptionsPage.tsx
│   │   │   └── ModerationDashboard.tsx
│   │   ├── components/              # Reusable components
│   │   │   ├── Layout.tsx           # Authenticated page wrapper
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── services/
│   │   │   └── api.ts               # API client service
│   │   ├── utils/
│   │   │   └── store.ts             # Zustand auth store
│   │   ├── App.tsx                  # Router setup
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   └── .gitignore
│
├── server/                          # Node.js + Express backend
│   ├── src/
│   │   ├── routes/                  # API route handlers
│   │   │   ├── auth.ts              # /api/auth/*
│   │   │   ├── posts.ts             # /api/posts/*
│   │   │   ├── map.ts               # /api/map/*
│   │   │   ├── endorsements.ts      # /api/endorsements/*
│   │   │   ├── profile.ts           # /api/profile/*
│   │   │   ├── organizations.ts     # /api/organizations/*
│   │   │   ├── marketplace.ts       # /api/marketplace/*
│   │   │   ├── vouchers.ts          # /api/vouchers/*
│   │   │   ├── subscriptions.ts     # /api/subscriptions/*
│   │   │   ├── boosts.ts            # /api/boosts/*
│   │   │   ├── achievements.ts      # /api/achievements/*
│   │   │   └── admin.ts             # /api/admin/* (moderation)
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT verification, token generation
│   │   │   └── validation.ts        # Input validation, geofencing, rate limiting
│   │   ├── services/                # Business logic (TODO: add later)
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── hex.ts               # H3 hexagon utilities
│   │   │   └── imageHash.ts         # Perceptual hashing & duplicate detection
│   │   └── index.ts                 # Express server entry point
│   ├── prisma/
│   │   └── schema.prisma            # Prisma data model (all entities)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .gitignore
│
├── shared/                          # (Optional) Shared types
│   ├── src/types/
│   ├── package.json
│   └── tsconfig.json
│
├── package.json                     # Root monorepo
└── README.md                        # This file

```

---

## Database Schema (Prisma)

All entities from the spec are modeled:

### Core Entities

- **User** — profiles, level, XP, GP, subscription status
- **Post** — planting posts with status (pending/approved/rejected/flagged)
- **PostImage** — 3 ordered images per post with perceptual hashes
- **Hex** — H3 grid cells with owner (user or org) and plant count
- **Endorsement** — post recommendations granting bonus hexes

### Organizations & Teams

- **Organization** — team profiles with leader and GP distribution settings
- **OrganizationMember** — membership with role and contribution score

### Marketplace

- **MarketplaceTask** — work listings
- **TaskApplication** — worker applications with negotiated rates
- **Review** — 1-5 star ratings and comments on completed work

### Monetization

- **Subscription** — PRO/MAX monthly subscriptions (Stripe linked)
- **Boost** — one-time €2 post/task promotions
- **Voucher** — charity/partner reward codes
- **UserVoucher** — redemption records

### Achievements & Moderation

- **Achievement** — badge definitions
- **UserAchievement** — unlocked badges per user
- **ModeratorFlag** — flagged posts with status (pending/approved/rejected/banned)

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** or **yarn**
- **PostgreSQL** 14+ (local or remote)
- **Mapbox** API token (free tier available)
- **Stripe** test keys (for subscription testing)
- **Cloudflare R2** credentials (or S3-compatible storage)

### Setup Instructions

#### 1. Clone and Install Dependencies

```bash
cd Greenify
npm install
```

This installs root dependencies and all workspaces (`client`, `server`, `shared`).

#### 2. Configure Environment Variables

**Server** (`.env`):

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/greenify
JWT_SECRET=your_super_secret_key_change_this_in_production
STRIPE_SECRET_KEY=sk_test_...
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=greenify-images
R2_PUBLIC_URL=https://your-domain.r2.dev
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

**Client** (`.env`):

```bash
cp client/.env.example client/.env
```

Edit `client/.env`:

```
VITE_API_URL=http://localhost:3000/api
VITE_MAPBOX_TOKEN=your_mapbox_public_token
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

#### 3. Set Up Database

```bash
# Create database in PostgreSQL
createdb greenify

# Push Prisma schema to database
npm run db:push --workspace=server

# (Optional) Open Prisma Studio to explore data
npm run db:studio --workspace=server
```

#### 4. Start Development Servers

In one terminal, start both client and server concurrently:

```bash
npm run dev
```

Or run separately:

```bash
# Terminal 1: Backend
npm run dev --workspace=server
# Runs on http://localhost:3000

# Terminal 2: Frontend
npm run dev --workspace=client
# Runs on http://localhost:5173
```

The frontend will proxy API calls to `http://localhost:3000/api`.

---

## API Routes (Stubbed)

All routes are stubbed with TODO comments. Here's the structure:

### Authentication

- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login with credentials, returns JWT
- `POST /api/auth/logout` — Logout
- `POST /api/auth/refresh` — Refresh JWT token

### Posts

- `POST /api/posts` — Create planting post (Level 3+)
- `GET /api/posts` — List posts (paginated, approved only)
- `GET /api/posts/:id` — Get post details
- `POST /api/posts/:id/report` — Report post for moderation

### Map

- `GET /api/map` — Get all hex data for Burgas
- `GET /api/map/hex/:h3Index` — Get single hex details
- `GET /api/map/user/:userId` — Get user's hexes
- `GET /api/map/organization/:orgId` — Get org's hexes

### Endorsements

- `POST /api/endorsements` — Endorse a post (grants hex if under cap)
- `GET /api/endorsements/post/:postId` — Get post's endorsements
- `GET /api/endorsements/user/:userId` — Get user's endorsements received

### Profile

- `GET /api/profile/:userId` — Get user profile (public)
- `GET /api/profile` — Get own profile (auth required)
- `PATCH /api/profile` — Update profile (auth required)
- `POST /api/profile/follow/:userId` — Follow user (auth required)

### Organizations

- `POST /api/organizations` — Create org (Level 5+)
- `GET /api/organizations` — List all orgs
- `GET /api/organizations/:orgId` — Get org details
- `PATCH /api/organizations/:orgId` — Update org settings (leader only)
- `POST /api/organizations/:orgId/invite` — Invite member (leader only)
- `DELETE /api/organizations/:orgId/members/:userId` — Remove member (leader only)

### Marketplace

- `POST /api/marketplace/tasks` — Post a task (Level 3+)
- `GET /api/marketplace/tasks` — List open tasks
- `POST /api/marketplace/applications` — Apply for task (1+ posts required)
- `POST /api/marketplace/applications/:appId/accept` — Accept worker (poster only)
- `POST /api/marketplace/tasks/:taskId/complete` — Mark task done (poster only)

### Vouchers

- `GET /api/vouchers` — List available vouchers
- `POST /api/vouchers/redeem` — Redeem voucher with GP

### Subscriptions

- `POST /api/subscriptions` — Create subscription (Stripe)
- `GET /api/subscriptions/me` — Get user's subscription
- `POST /api/subscriptions/me/cancel` — Cancel subscription
- `POST /api/subscriptions/webhook` — Stripe webhook handler

### Boosts

- `POST /api/boosts` — Create €2 post/task boost (Stripe)
- `GET /api/boosts/active` — List active boosts

### Achievements

- `GET /api/achievements` — List all achievement definitions
- `GET /api/achievements/user/:userId` — Get user's unlocked achievements

### Admin/Moderation

- `GET /api/admin/moderation/queue` — Get flagged posts (mod only)
- `POST /api/admin/moderation/:flagId/approve` — Approve post (mod only)
- `POST /api/admin/moderation/:flagId/ban-user` — Ban user (mod only)
- `GET /api/admin/users` — List users (admin only)
- `GET /api/admin/stats` — Platform statistics (admin only)

---

## React Pages (Stubbed)

All pages are stubbed with TODO comments for incomplete functionality:

- **`/`** — Landing page with sponsor logos and CTA
- **`/map`** — Interactive hex map (Mapbox GL + H3)
- **`/feed`** — Post feed with endorsement/comment actions
- **`/create-post`** — 3-photo post creation wizard
- **`/profile/:userId`** — User profile with portfolio and achievements
- **`/profile/edit`** — Edit own profile
- **`/organizations`** — List organizations
- **`/organizations/:orgId`** — Organization detail with members
- **`/marketplace`** — Task listings and worker profiles
- **`/marketplace/post-task`** — Create new task
- **`/vouchers`** — Redeem vouchers with GP
- **`/subscriptions`** — Pricing page (PRO/MAX tiers)
- **`/admin/moderation`** — Moderation dashboard

---

## Build & Deployment

### Build for Production

```bash
npm run build
```

This builds both server and client:

- **Server**: TypeScript → JavaScript in `/server/dist`
- **Client**: Vite → optimized bundle in `/client/dist`

### Run Production Build

```bash
npm start
```

Starts the Express server on port 3000. Serve the client build separately or via a static file server.

---

## Important Notes

### TODO Items Throughout Codebase

Every API route and React page has TODO comments indicating what needs to be implemented:

- **Authentication**: Password hashing, token validation, refresh logic
- **Image Uploads**: Cloudflare R2 integration, perceptual hashing
- **Duplicate Detection**: AI image comparison API calls
- **Stripe Integration**: Payment processing, subscription webhooks
- **Rate Limiting**: In-memory or Redis-based post creation limits
- **Geofencing**: GPS validation within Burgas bounds
- **H3 Hexagon Logic**: Hex claiming, contiguity checks, territory rendering
- **Marketplace Logic**: Task acceptance workflow, GP transfers
- **Organization Distribution**: GP payouts per distribution mode

### First Steps for Development

1. **Implement Auth** — Register, login, JWT generation and validation
2. **Set up Database** — Prisma migrations, seed initial data
3. **Image Upload** — Cloudflare R2 integration and perceptual hashing
4. **Hex Map Rendering** — Fetch hexes, render on Mapbox, click handlers
5. **Post Creation** — Full flow: upload 3 images, GPS lock, AI check, claim hex
6. **Marketplace Core** — Post task, apply, accept, complete, leave review

### Testing

No test files are included in this initial commit. Recommended testing approach:

- **Unit tests**: Jest for utilities and business logic
- **Integration tests**: Supertest for API routes
- **E2E tests**: Playwright for user workflows

---

## Sponsors

This project is backed by:

- **EcoVerde Solutions** — sustainable urban landscaping
- **BioNest Bulgaria** — organic seeds and fertilizers
- **GreenTech Capital** — impact investing
- **Черно море Еко** (Black Sea Eco) — coastal conservation NGO
- **Sunny Beach Resorts Group** — hospitality carbon offsetting
- **Varna & Burgas Chamber of Commerce** — regional business support
- **SolarGrid BG** — renewable energy provider

---

## License

TBD

---

## Support

For questions or issues during development, refer to inline TODO comments in the code or the full product specification document.

Happy coding! 🌱
