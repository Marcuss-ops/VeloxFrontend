// Flat config that shadows the parent `web/eslint.config.js`.
//
// `web/dark_editor` is a Next.js app nested inside the `web/` Vite SPA. ESLint 8
// (used here) auto-detects flat config by walking *up* the tree, so it was
// finding `web/eslint.config.js` and loading `web/node_modules`'s
// `@typescript-eslint/eslint-plugin` (v8.65.0) under the ESLint 8 linter —
// which crashes on `@typescript-eslint/no-unused-expressions`.
//
// This file stops that upward search by providing a local flat config that
// bridges the real eslintrc config (.eslintrc.json) via FlatCompat. `next lint`
// keeps using .eslintrc.json directly (it forces `useEslintrc: true`); this
// file is what plain `eslint`/`npx eslint`/editor tooling picks up instead of
// the parent's config.
const { FlatCompat } = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

module.exports = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['lib/wasm/pkg/**'],
  },
  {
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
