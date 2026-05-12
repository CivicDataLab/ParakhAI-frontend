# Parakh AI Frontend

[![License: MIT](https://img.shields.io/badge/License-AGPL-yellow.svg)](https://opensource.org/licenses/AGPL)
[![Next.js](https://img.shields.io/badge/Next.js-14.2+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

ParakhAI is a platform for evaluating AI models, creating prompt datasets, and running expert-led evaluations against those models.

## Features

- AI Maker dashboard for model and organization-level workflows
- Evaluation creation and test case management
- Auditor-facing views for assignments and review
- GraphQL-based data access with generated typed clients
- Keycloak + NextAuth authentication flow

## Tech Stack

- **Framework:** Next.js 
- **UI:** React + TypeScript + Tailwind CSS
- **Data:** GraphQL
- **Auth:** NextAuth + Keycloak
- **State/Data Fetching:** Zustand, React Query
- **Charts/Visuals:** ECharts

## Getting Started

### 1) Clone the repository

```bash
git clone https://github.com/CivicDataLab/ParakhAI-frontend.git
cd ParakhAI-frontend
```

### 2) Install dependencies

```bash
npm install
```

### 3) Create `.env.local`

Create a `.env.local` file in the project root with:

```env
# Auth / Keycloak
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
AUTH_ISSUER=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
END_SESSION_URL=
REFRESH_TOKEN_URL=
NEXT_PUBLIC_AI_MAKER_URL=
NEXT_PUBLIC_DATASPACE_API_URL=

# Backend URLs
NEXT_PUBLIC_BACKEND_URL=
NEXT_PUBLIC_BACKEND_BASE_URL=
```

### 4) Start development server

```bash
npm run dev
```

## Documentation

- [Next.js App Router docs](https://nextjs.org/docs/app)

## Community

We use Github Discussions to discuss ideas, proposals and questions about the project. You can [head over there](https://github.com/CivicDataLab/ParakhAI-frontend/discussions) to interact with the community.

Our [Code of Conduct](CODE_OF_CONDUCT.md) applies to all community channels.

## Contributing

Contributions to the project are welcome! To contribute, simply fork the repository, make your changes, and submit a pull request.

For more information on contributing to the project, refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file.

## License

This project is licensed under the AGPL-3.0 license. For more information, refer to the [LICENSE](LICENSE.md) file.

## Security

If you believe you have found a security vulnerability in Data Exchange, we encourage you to responsibly disclose this and not open a public issue. We will investigate all legitimate reports. Email `tech@civicdatalab.in` to disclose any security vulnerabilities.
