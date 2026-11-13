import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // A biblioteca MQTT.js sozinha tem ~350 kB; o aviso padrao (500 kB) dispara a toa
    chunkSizeWarningLimit: 800,
  },
})
