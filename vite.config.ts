import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Acompanha o asyncUtilTimeout de 5 s do setup: um teste com várias esperas não pode estourar antes delas.
    testTimeout: 15000,
    env: { VITE_API_URL: '/api/v1', VITE_POLL_PAGAMENTO_MS: '40' },
  },
})
