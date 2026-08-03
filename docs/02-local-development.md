# Local Development Guide

## Prerequisites

- Node.js (LTS recommended)
- npm
- Access to Keycloak and backend GraphQL environment values

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure `.env.local`.

## Environment variables in use

### Auth (server-side)

- `KEYCLOAK_CLIENT_ID`
- `KEYCLOAK_CLIENT_SECRET`
- `AUTH_ISSUER`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

### App/API (client-side)

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_BASE_URL`
- `NEXT_PUBLIC_DATASPACE_API_URL`
- `NEXT_PUBLIC_DATASPACE_HOST` (or `NEXT_PUBLIC_AI_MAKER_URL`)

## Commands currently used

- `npm run dev` - run local development server on port `3000`
- `npm run lint` - run lint checks
- `npm run build` - create production build
- `npm run start` - run production server from build output

## Quick verification

1. Run `npm run dev`.
2. Open `http://localhost:3000` and confirm redirect to `/en`.
3. Open a protected dashboard route and confirm auth redirect/session flow.
4. Confirm dashboard pages load GraphQL data without auth errors.
