import { FlatCompat } from '@eslint/eslintrc';
import typescriptESLint from '@typescript-eslint/eslint-plugin';
import eslintImport from 'eslint-plugin-import';
import jest from 'eslint-plugin-jest';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import prettier from 'eslint-plugin-prettier';
import promise from 'eslint-plugin-promise';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import storybook from 'eslint-plugin-storybook';
import testingLibrary from 'eslint-plugin-testing-library';
import unusedImports from 'eslint-plugin-unused-imports';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends(
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:jest/recommended',
    'plugin:testing-library/react',
    'plugin:storybook/recommended',
    'plugin:promise/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ),
  {
    ignores: [
      'node_modules/*',
      '.next/*',
      '.husky/*',
      'public/*',
      'package-lock.json',
      'package.json',
      'storybook-static/*',
    ],
  },
  {
    plugins: {
      prettier,
      jsxA11y,
      reactHooks,
      promise,
      jest,
      testingLibrary,
      storybook,
      'simple-import-sort': simpleImportSort,
      'import': eslintImport,
      'unused-imports': unusedImports,
      perfectionist,
      '@typescript-eslint': typescriptESLint,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error'],
      'prettier/prettier': 'error',
      'eol-last': ['error', 'always'],
    },
  },
  {
    rules: {
      // Prettier
      'prettier/prettier': 'error',

      // import sort
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/order': 'off',

      // unused
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
  },
];

export default eslintConfig;
