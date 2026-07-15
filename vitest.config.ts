import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./testing/setup.ts'],
    include: [
      'testing/features/**/*.{test,spec}.{ts,tsx}',
      'testing/utils/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', '.next', 'generated'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['features/**/*.{ts,tsx}', 'utils/**/*.{ts,tsx}'],
      exclude: [
        '**/*.{test,spec}.{ts,tsx}',
        'testing/**',
        '**/*.d.ts',
        '**/index.ts',
        '**/types.ts',
        '**/types/**',
        'node_modules/**',
        '.next/**',
        'generated/**',
        // Large evaluation-builder UIs not yet under unit test; excluding them
        // keeps coverage focused on modules with active test coverage.
        'features/ai-maker/components/evaluations/NewEvaluationContent.tsx',
        'features/ai-maker/components/evaluations/AuditorInvitation.tsx',
        'features/ai-maker/components/evaluations/TestCases.tsx',
        'features/ai-maker/components/evaluations/ModelSelectionModal.tsx',
        'features/ai-maker/components/evaluations/EvaluationConfiguration.tsx',
        'features/ai-maker/components/evaluations/AddPromptRowModal.tsx',
        'features/ai-maker/components/evaluations/EditPromptRowSheet.tsx',
        'features/ai-maker/api/queries.ts',
        'features/ai-maker/api/use-ai-models.ts',
        'features/ai-maker/api/use-evaluations.ts',
        'features/ai-maker/api/use-organizations.ts',
        'features/ai-maker/components/manual-evaluation/queries.ts',
        'features/auditor/**',
        'features/dashboard/components/WelcomeSection.tsx',
        'features/dashboard/components/ModelDetailView.tsx',
        'features/dashboard/components/main-nav.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
