# ServiPro — Service Marketplace Platform

## Overview

Full-stack service marketplace admin panel built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: v24
- **Package manager**: pnpm
- **TypeScript**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: React + Vite (admin panel)
- **Auth**: JWT (SESSION_SECRET env var)
- **Real-time**: WebSocket (ws package) — per-booking chat rooms
- **Push notifications**: Web Push / VAPID (no Firebase)
- **Location**: Haversine formula — GPS distance sorting, no Google Maps billing

## Artifacts

| Artifact | Kind | Port | Description |
|---|---|---|---|
| `artifacts/admin` | web | $PORT | React admin dashboard |
| `artifacts/api-server` | api | 8080 | Express REST + WebSocket API |

## API Routes (`/api/...`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Register any user |
| POST | `/auth/login` | public | Login, returns JWT |
| GET | `/auth/me` | JWT | Get current user |
| GET | `/users` | admin | List all users (optional `?role=`) |
| PATCH | `/users/:id/status` | admin | Suspend / activate user |
| GET | `/providers` | JWT | Find providers `?lat=&lng=&radius=&region=&category=` |
| GET | `/providers/regions` | admin | Provider count per Ghana region |
| PATCH | `/providers/:id/location` | admin/self | Set lat, lng, region |
| GET | `/bookings` | JWT | List bookings |
| POST | `/bookings` | JWT | Create booking |
| PATCH | `/bookings/:id/status` | JWT | Update booking status |
| GET | `/ratings` | JWT | List ratings |
| POST | `/ratings` | JWT | Submit rating |
| GET | `/reports` | admin | List reports (with reporter/reported names) |
| POST | `/reports` | JWT | Submit report |
| PATCH | `/reports/:id/status` | admin | Review / resolve report |
| GET | `/stats` | admin | Dashboard stats + top services |
| GET | `/notifications` | JWT | List notifications |
| GET | `/messages/:bookingId` | JWT | Chat history |
| WS | `/api/chat/:bookingId?token=JWT` | JWT | Real-time chat |
| GET | `/push/vapid-public-key` | public | VAPID public key |
| POST | `/push/subscribe` | JWT | Register push subscription |
| DELETE | `/push/subscribe` | JWT | Unregister push subscription |

## Database Tables

`users`, `bookings`, `ratings`, `reports`, `notifications`, `messages`, `push_subscriptions`

## Admin Dashboard Pages

- **Dashboard** — live stats: total users, active providers, bookings, completion rate, top services
- **Users** — manage all users with role filter + search, suspend/activate
- **Providers** — approve/reject/suspend providers, filter by status
- **Location** — region distribution chart, GPS distance tester (Haversine), set lat/lng per provider
- **Reports** — review and resolve reports with admin notes modal

## Location System

### Region-Based Filtering
- 16 Ghana regions predefined (`artifacts/api-server/src/lib/regions.ts`)
- `GET /api/providers?region=Greater+Accra` filters by region
- Admin can assign region to any provider

### GPS Distance Sorting (Haversine)
- `lat` + `lng` stored on each user row
- `GET /api/providers?lat=5.6&lng=-0.19&radius=10` returns providers within 10 km sorted by distance
- No Google Maps API key required
- Admin GPS tester on Location page for live testing

## Key Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-provided) |
| `SESSION_SECRET` | JWT signing secret |
| `VAPID_PUBLIC_KEY` | Web Push public key (generated) |
| `VAPID_PRIVATE_KEY` | Web Push private key (generated) |
| `VAPID_EMAIL` | Web Push contact email |

## Admin Test Account

- **Email**: `admin@servipro.com`
- **Password**: `admin123`
- **Role**: `admin`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` (`composite: true`). Always typecheck from root:
```
pnpm run typecheck
```

## DB Migrations

Development: `pnpm --filter @workspace/db run push`
