# Project Overview

## What this project is

`ParakhAI-frontend` is a Next.js 14 (App Router) web application for participatory AI evaluation workflows.  
It supports role-driven experiences for:

- **AI Maker** users (organization-based model and evaluation management)
- **Evaluator/Auditor** users (assignment-based model evaluation workflows)

The app uses locale-aware routing.

## Core capabilities

- Role-selection dashboard for authenticated users
- Organization-scoped AI Maker workspace
- Auditor assignment and evaluation views
- Keycloak-backed authentication via NextAuth
- GraphQL-based integration with backend services
- UI components powered by `opub-ui`

## Primary tech stack

- **Framework**: Next.js 14 (`app` directory, App Router)
- **Language**: TypeScript
- **Auth**: `next-auth` + Keycloak provider
- **Data**: `graphql-request`
- **State**: Zustand (app-level store), React Query (global provider)
- **Styling**: Tailwind CSS + global styles
- **Internationalization**: `next-intl`

## High-level app flow

1. User visits `/` and is redirected to locale route (default `/en`).
2. Middleware applies locale handling and route protection.
3. Protected routes require NextAuth session.
4. Frontend issues authenticated GraphQL calls using bearer tokens from session.
5. Dashboards and detail pages render data based on role and organization context.

## Important directories (at a glance)

- `app/` - Next.js routes, layouts, and API handlers
- `app/[locale]/` - Locale-aware pages and dashboard routes
- `app/api/auth/` - NextAuth and logout endpoints
- `lib/` - GraphQL client, session helpers, utility code
- `config/` - locales and Zustand store
- `components/` - reusable UI wrappers and guards
