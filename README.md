# Van Cortlandt Park — Bench Adoption

https://bench-manager.vercel.app/

A desktop and mobile web app for Van Cortlandt Park's bench adoption program. Over 470 benches across the park are available for donors to adopt on a yearly basis, from 1 to 10 years at a time, with a minimum donation of $4,000 per year.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database & Auth | Supabase |
| Maps | Leaflet + MapTiler |
| Hosting | Vercel |

## Pages

### Home `/`
Landing page with park highlights, a call-to-action directing visitors to the adoption flow, and a **Current Adoptions** map showing adopted benches in green. Visitors can hover over adopted benches to see plaque messages left by donors — no login required.

### Adoption `/reservation`
Interactive bench selection and adoption. Users browse benches on a Leaflet map or a list view, filter by region (North / Central / South), pick available years on a calendar, enter a donation amount, and optionally write a plaque message (up to 3 lines). Adoptions must start at the earliest available year for the selected bench, and can extend up to 10 years (through 2040). One active adoption per user at a time.

### Account `/account`
Authenticated users can view their active and past adoptions, reveal plaque messages with an eye icon toggle, cancel a current adoption, and manage their profile.

### Admin `/admin`
Protected admin dashboard with four sections:
- **User management** — search, view, and remove user accounts.
- **Adoption management** — filter by status, view plaque messages via eye icon, cancel or delete any adoption.
- **Bench management** — add, move, restrict, or delete benches. Inline editing of bench codes and regions. Batch operations (restrict, unrestrict, delete) on selected benches.
- **Admin map** — visual bench editor with drag-to-move, click-to-select, and coordinate editing.

### Auth (modal)
Login, sign-up, and forgot-password flows rendered in a modal overlay from any page.

## Project Structure

```
app/                  → Next.js routes and server actions
  actions/            → Server actions (auth, adoptions, admin)
  account/            → Account page
  admin/              → Admin dashboard
  reservation/        → Adoption page
components/           → React components
  admin/              → Admin view + admin bench map
  bench-map/          → Public Leaflet map
  bench-list/         → List-view alternative to the map
  month-calendar/     → Year picker calendar
  reserve-bar/        → Adoption confirmation bar
  donation/           → Donation amount input
  plaque/             → Plaque message textarea
  nav/                → Site navigation
  auth-modal/         → Login / sign-up modal
  ui/                 → Shared UI primitives
lib/                  → Shared utilities, types, data fetching
  supabase/           → Supabase client setup
supabase/migrations/  → Database schema and seed migrations
```

## Planning Document (with admin login)

https://docs.google.com/document/d/1-c0OclKbDHlPAEKLLsp9DzblACtyms_djPY9s3EROzU/edit?tab=t.0
