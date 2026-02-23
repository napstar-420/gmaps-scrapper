import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import tsdocPlugin from 'eslint-plugin-tsdoc'
import { fileURLToPath } from 'url'
import path from 'path'

// Flat ESLint config for the server (ESLint >= 9)
// Mirrors the previous .eslintrc.cjs rules.

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default tseslint.config(
    {
        ignores: ['dist/**', 'scripts/**', 'cmd/**', 'tools/**', '**/*.d.ts'],
    },
    {
        files: ['**/*.ts'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            parserOptions: {
                tsconfigRootDir: __dirname,
            },
        },
        plugins: {
            import: importPlugin,
            tsdoc: tsdocPlugin,
        },
        extends: [...tseslint.configs.recommended],
        rules: {
            'no-console': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-dupe-class-members': 'error',
            '@typescript-eslint/no-useless-constructor': 'error',
            '@typescript-eslint/no-inferrable-types': 'off',
            'import/extensions': ['error', 'ignorePackages', { js: 'always', jsx: 'never', ts: 'never', tsx: 'never' }],
        },
    },
)
