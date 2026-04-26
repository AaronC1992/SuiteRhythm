import path from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const sharedGlobals = {
  AbortController: 'readonly',
  Blob: 'readonly',
  caches: 'readonly',
  clearInterval: 'readonly',
  clearTimeout: 'readonly',
  console: 'readonly',
  crypto: 'readonly',
  CustomEvent: 'readonly',
  document: 'readonly',
  Event: 'readonly',
  fetch: 'readonly',
  FileReader: 'readonly',
  FormData: 'readonly',
  global: 'readonly',
  Headers: 'readonly',
  localStorage: 'readonly',
  location: 'readonly',
  MediaRecorder: 'readonly',
  navigator: 'readonly',
  process: 'readonly',
  ReadableStream: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  self: 'readonly',
  setInterval: 'readonly',
  setTimeout: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  window: 'readonly',
};

export default [
  {
    ignores: [
      '.next/**',
      '**/.next/**',
      'coverage/**',
      'node_modules/**',
      'out/**',
      'scripts/fix-encoding*.js',
      '**/scripts/fix-encoding*.js',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  ...compat.extends('next/core-web-vitals'),
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: sharedGlobals,
    },
    rules: {
      'import/no-anonymous-default-export': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
];
