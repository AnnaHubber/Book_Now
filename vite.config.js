import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Express server in server.js mounts Vite as middleware, so there is no
// dev server and no proxy here — one process serves the API and the app.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
