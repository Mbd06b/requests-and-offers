import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type PluginOption } from 'vite';
import path from 'node:path';

export default defineConfig({
  plugins: [sveltekit(), purgeCss()] as PluginOption[],
  resolve: {
    alias: {
      // Force single import path - redirect direct imports to wrapper
      '$lib/services/HolochainClientService.svelte':
        path.resolve(__dirname, 'src/lib/services/holochainClient.service.ts'),
    }
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      '.ethosengine.com', // Allow all subdomains of ethosengine.com
      'localhost'
    ]
  },
  build: {
    chunkSizeWarningLimit: 2000,
    target: 'es2022' // Support top-level await
  },
  envDir: '../' // Look for .env files in the parent directory (project root)
});
