// @ts-check
// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    server: {
      watch: {
        usePolling: true,
      },
    },
    // MUI uses mixed CJS/ESM internally. Without this, Vite's SSR bundler
    // treats MUI as a server external and fails to resolve its sub-module
    // imports (the __vite_ssr_import_0__.default error). noExternal forces
    // Vite to bundle these packages itself so imports resolve correctly.
    ssr: {
      noExternal: [
        '@mui/material',
        '@mui/system',
        '@mui/utils',
        '@mui/base',
        '@emotion/react',
        '@emotion/styled',
        '@emotion/cache',
      ],
    },
  },
});