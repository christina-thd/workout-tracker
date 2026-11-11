// ESLint recommended rules plus a few for modern JavaScript.
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js', 'test/**/*.js', '*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // shared/ also runs on the server but uses no globals
    files: ['public/js/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'], // allows `x == null`
      'object-shorthand': 'error',
      'prefer-template': 'error',
    },
  },
];
