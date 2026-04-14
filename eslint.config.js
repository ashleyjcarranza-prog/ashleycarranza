import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['drizzle/**', 'node_modules/**', 'worker-configuration.d.ts']
  },
  js.configs.recommended,
  {
    files: ['public/assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        bootstrap: 'readonly'
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  {
    files: ['eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  }
];
