import pluginPrettier from 'eslint-plugin-prettier';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
    {
        // Global ignores - these patterns will be ignored in all configurations
        ignores: [
            // Dependencies
            'node_modules/**',

            // Build output
            'dist/**',
            'build/**',

            // Environment files
            '.env*',

            // Database files
            '*.sql',
            '*.db',
            '*.sqlite',

            // Logs
            'logs/**',
            '*.log',
            'npm-debug.log*',
            'yarn-debug.log*',
            'yarn-error.log*',

            // Coverage directory
            'coverage/**',
            '.nyc_output/**',

            // Cache directories
            '.cache/**',
            '.parcel-cache/**',
            '.next/**',
            '.nuxt/**',

            // Temporary folders
            'tmp/**',
            'temp/**',

            // IDE files
            '.vscode/**',
            '.idea/**',
            '*.swp',
            '*.swo',

            // OS generated files
            '.DS_Store',
            'Thumbs.db',

            // Serverless directories
            '.serverless/**',

            // TypeScript build info
            '*.tsbuildinfo',
        ],
    },
    {
        files: ['**/*.{js,cjs,mjs,ts,tsx}'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module',
            },
            globals: {
                process: 'readonly',
                __dirname: 'readonly',
                require: 'readonly',
            },
        },
        plugins: {
            prettier: pluginPrettier,
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            'prettier/prettier': 'error',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_' },
            ],
        },
    },
];
