# Architecture and Code Map

## Top-level architecture

This frontend is structured around Next.js App Router with:

- Global root layout in `app/layout.tsx`
- Locale-aware route segment in `app/[locale]/`
- Dashboard sections under `app/[locale]/dashboard/`
- API auth handlers under `app/api/auth/`

## Routing model

### Root and locale routes

- `app/page.tsx` redirects `/` to `/en`
- `app/[locale]/page.tsx` renders the home page sections
- Locales are configured in `config/locales.ts`

### Dashboard routes

Main dashboard layout:

- `app/[locale]/dashboard/layout.tsx`
  - wraps dashboard in `DashboardGuard`
  - renders shared navigation/footer

Role landing:

- `app/[locale]/dashboard/page.tsx` - role selection ("AI Maker" / "Evaluator")

AI Maker area:

- `app/[locale]/dashboard/ai-maker/page.tsx` - organization selection
- `app/[locale]/dashboard/ai-maker/[orgId]/layout.tsx` - organization context and shell
- `app/[locale]/dashboard/ai-maker/[orgId]/page.tsx` - overview, models, recent evaluations
- additional nested routes for models, evaluations, auditors, and prompt libraries

Auditor area:

- `app/[locale]/dashboard/auditor/page.tsx` - overview + assignments workflow
- additional nested routes for models/evaluations

## Middleware behavior

`middleware.ts` combines:

- locale handling (`next-intl` middleware)
- route protection (`withAuth` from NextAuth)

Public page list is intentionally small (currently only home route), and all non-public pages are protected.

## UI and rendering conventions

- Several components are dynamically imported with `ssr: false` to avoid UI library SSR issues.
- Shared UI primitives come from `opub-ui`.
- Styling uses Tailwind classes plus project style modules/global CSS.

## State and context map

- **Zustand** in `config/store.tsx` stores dashboard-centric state (`userDetails`, `entityDetails`, etc.)
- **OrganizationContext** (AI Maker org routes) provides selected organization metadata
- **Session/AppSession hooks** expose auth tokens and user identity

## API surface inside frontend

Only auth-focused API routes are currently defined:

- `app/api/auth/[...nextauth]/route.ts` - NextAuth handler
- `app/api/auth/logout/route.ts` - Keycloak logout URL generation
