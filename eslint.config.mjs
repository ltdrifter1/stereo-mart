import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '*.config.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node build/QA scripts (run with `node`, not the browser bundle).
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLUListElement: 'readonly',
        PointerEvent: 'readonly',
        WheelEvent: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        React: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
];
