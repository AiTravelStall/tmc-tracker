import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Module boundaries (design doc §5.1, §21.4).
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'coverage/**']),
  {
    files: ['components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@/lib/server', '@/lib/server/*'], message: 'Server-only modules cannot be imported into components. Call an /api route instead.' }],
      }],
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
      'no-restricted-syntax': ['error', {
        selector: 'Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]/]',
        message: 'Use a design token (tmc-*) instead of a raw hex colour in className.',
      }],
    },
  },
  {
    files: ['lib/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['@/components/*'], message: 'lib/ must not depend on components/. Move shared types to types/.' }] }],
    },
  },
]);
