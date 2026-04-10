import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    KEYCLOAK_CLIENT_ID: z.string().min(1),
    KEYCLOAK_CLIENT_SECRET: z.string().min(1),
    AUTH_ISSUER: z.string().min(1),
    NEXTAUTH_URL: z.string().url().default('http://localhost:3000'),
    NEXTAUTH_SECRET: z.string().min(8),
    END_SESSION_URL: z.string().url(),
    REFRESH_TOKEN_URL: z.string().url(),
    // Backend URL for GraphQL proxy (server-side only, can be different from client-side)
    BACKEND_URL: z.string().min(1).optional(),
    // SENTRY_FEATURE_ENABLED: z.string().optional(),
    // SENTRY_ORG_NAME: z.string().optional(),
    // SENTRY_PROJECT_NAME: z.string().optional(),
    // SENTRY_DSN_URL: z.string().optional(),
    // SENTRY_PROJECT_ID: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_GA_ID: z.string().optional(),
    NEXT_PUBLIC_PLATFORM_URL: z.string().url().default('http://localhost:3000'),
    // Backend URL can be with or without protocol (protocol will be added automatically if missing)
    NEXT_PUBLIC_BACKEND_URL: z.string().min(1).default(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:9001/graphql'),
    NEXT_PUBLIC_BACKEND_BASE_URL: z.string().min(1).default(process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9001/'),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_PLATFORM_URL: process.env.NEXT_PUBLIC_PLATFORM_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_BACKEND_BASE_URL: process.env.NEXT_PUBLIC_BACKEND_BASE_URL,
  },
  
  skipValidation: process.env.NODE_ENV === 'development' && !process.env.CI,
});
