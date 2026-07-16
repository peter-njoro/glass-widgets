// SPDX-License-Identifier: CC0-1.0
import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ARGV: 'readonly',
                Debugger: 'readonly',
                GIRepositoryGType: 'readonly',
                globalThis: 'readonly',
                imports: 'readonly',
                Intl: 'readonly',
                log: 'readonly',
                logError: 'readonly',
                pkg: 'readonly',
                print: 'readonly',
                printerr: 'readonly',
                window: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',
                global: 'readonly',
                _: 'readonly',
                C_: 'readonly',
                N_: 'readonly',
                ngettext: 'readonly',
            },
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
    },
];
