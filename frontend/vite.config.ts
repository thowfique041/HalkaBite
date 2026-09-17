import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@reduxjs') || id.includes('react-redux')) return 'state-vendor'
          if (id.includes('react-router')) return 'router-vendor'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor'
          if (id.includes('framer-motion') || id.includes('motion-dom')) return 'motion-vendor'
          if (id.includes('leaflet')) return 'map-vendor'
          if (id.includes('lucide-react')) return 'icons-vendor'
          return 'vendor'
        },
      },
    },
  },
})
