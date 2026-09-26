import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript
      'react/jsx-uses-react': 'off',
      'react/jsx-uses-vars': 'error',
      
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      
      // General rules
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',

      // Transport authority guardrail: application code must go through the
      // canonical client.ts engine (CSRF, session credentials, retry,
      // unified ApiError). Raw fetch() bypasses all of it — the historical
      // source of silent-fallback and divergent-auth bugs. lib/api/* and
      // lib/session-refresh.ts are the sanctioned escape hatches.
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: "Use the canonical API transport: import fetchJSON/fetchVoid/apiGet/apiPost from '@/lib/api/client' (or a lib/api/* module). Raw fetch() bypasses CSRF, session credentials and the retry/error engine.",
        },
      ],
    },
  },
  {
    // The sanctioned transport layer keeps its raw-fetch escape hatches
    // (binary downloads, the session-refresh bootstrap) — everything above
    // it must go through it.
    files: ['src/lib/api/**', 'src/lib/session-refresh.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      'e2e/**',
      // dark_editor is a separate Next.js app (own package.json, own ESLint
      // 8 + eslintrc config) nested inside web/. Never lint it with the SPA's
      // ESLint 9 flat config.
      'dark_editor/**',
    ],
  }
);