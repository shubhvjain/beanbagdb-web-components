import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        customElement: true
      }
    })
  ],
  build: {
    lib: {
      entry: 'src/index.js',
      name: 'BBDBComponents',
      fileName: 'main',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['svelte'],
      output: {
        globals: { svelte: 'Svelte' }
      }
    }
  }
});
