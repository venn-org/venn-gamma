// Flat config (ESLint 9). `expo` brings the React/React Native/import rules;
// everything below is the project's own policy on top of it.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettier,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'supabase/.temp/*'],
  },
  {
    rules: {
      // The rule that pays for this whole config: every stale-closure bug in
      // the feed/chat screens was an effect with under-declared deps.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',

      // React-Compiler-powered diagnostics (react-hooks v6). They flag real
      // smells, but the existing screens trip them ~170 times — failing the
      // build on day one would just get the whole config disabled. Kept as
      // warnings so they're visible and can be burned down per screen; CI
      // fails on errors only (see --max-warnings in the workflow, currently
      // unset deliberately).
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',

      // A web/HTML-entity concern. Text in React Native lives inside <Text>,
      // where an apostrophe is just an apostrophe.
      'react/no-unescaped-entities': 'off',

      // console.* ships to production. lib/log.js is the sanctioned path —
      // it no-ops outside __DEV__ and can be routed to a crash reporter.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Screens must go through services/ for data access. Importing the client
    // directly is how query logic ended up spread across nine screen files.
    files: ['app/**/*.jsx', 'app/**/*.tsx', 'components/**/*.jsx'],
    rules: {
      'no-restricted-imports': [
        'warn',
        {
          paths: [
            {
              name: '../../lib/supabase',
              message:
                'Screens should call a services/ module instead of querying Supabase directly.',
            },
            {
              name: '../lib/supabase',
              message:
                'Screens should call a services/ module instead of querying Supabase directly.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/__tests__/**/*.js', '**/*.test.js', 'jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
  {
    // Node scripts and build config — not part of the app bundle.
    files: ['scripts/**/*.js', '*.config.js', 'eslint.config.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
      },
    },
    rules: { 'no-console': 'off' },
  },
]);
