# Van Cortlandt Park — Bench Adoption

https://bench-manager.vercel.app/

A web app for Van Cortlandt Park's bench adoption program. Over 500 benches across the park are available for donors to adopt on a monthly basis, up to one year at a time.

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
Landing page with a park map preview, bench count, and a call-to-action directing visitors to the reservation flow.

### Reservation `/reservation`
Interactive bench selection and booking. Users browse benches on a Leaflet map or a list view, filter by region (North / Central / South), pick available months on a calendar, and confirm their reservation. One active reservation per user at a time.

### Account `/account`
Authenticated users can view their active and past reservations, cancel a current adoption, and manage their profile.

### Admin `/admin`
Protected admin dashboard with three sections:
- **User management** — search, view, and remove user accounts.
- **Reservation management** — filter by status, cancel or delete any reservation.
- **Bench management** — add, move, restrict, or delete benches. Inline editing of bench codes and regions. Batch operations (restrict, unrestrict, delete) on selected benches.
- **Admin map** — visual bench editor with drag-to-move, click-to-select, and coordinate editing.

### Auth (modal)
Login, sign-up, and forgot-password flows rendered in a modal overlay from any page.

## Project Structure

```
app/                  → Next.js routes and server actions
  actions/            → Server actions (auth, reservations, admin)
  account/            → Account page
  admin/              → Admin dashboard
  reservation/        → Reservation page
components/           → React components
  admin/              → Admin view + admin bench map
  bench-map/          → Public Leaflet map
  bench-list/         → List-view alternative to the map
  month-calendar/     → Month picker calendar
  reserve-bar/        → Reservation confirmation bar
  nav/                → Site navigation
  auth-modal/         → Login / sign-up modal
  ui/                 → Shared UI primitives
lib/                  → Shared utilities, types, data fetching
  supabase/           → Supabase client setup
supabase/migrations/  → Database schema and seed migrations
```

## Planning Document (with admin login)

https://docs.google.com/document/d/1-c0OclKbDHlPAEKLLsp9DzblACtyms_djPY9s3EROzU/edit?tab=t.0


