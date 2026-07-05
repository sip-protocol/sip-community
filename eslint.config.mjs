import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Local agent tooling state, not part of the app (gitignored; ESLint's flat
    // config doesn't consult .gitignore, so it still needs to be told here):
    '.remember/**',
    '.superpowers/**',
  ]),
])

export default eslintConfig
