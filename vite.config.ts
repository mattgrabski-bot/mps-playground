import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `base: './'` makes the build work on GitHub Pages under any repo name
// (https://<user>.github.io/<repo>/) without further configuration.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
