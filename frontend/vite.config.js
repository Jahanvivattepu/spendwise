```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api is proxied to the Spring Boot backend, so the same relative
// paths work in dev and in production (where nginx does the proxying).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
