// config/codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  // Where to fetch the GraphQL schema from.
  // Uses your existing env var; will use fallback during backend integration
  schema: 'https://dev.api.parakh.civicdataspace.in/graphql/',

  // Where to look for GraphQL operations (queries/mutations) in your code
  documents: ['app/**/*.{ts,tsx}', 'features/**/*.{ts,tsx}'],

  // Where to put generated types & helpers
  generates: {
    './generated/': {
      preset: 'client',   // uses @graphql-codegen/client-preset
      plugins: [],        // no extra plugins needed with this preset
    },
  },
};

export default config;