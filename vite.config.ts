import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'FormReady',
        short_name: 'FormReady',
        description: 'Fix your exam form photo, signature and ID offline.',
        theme_color: '#C93A00',
        background_color: '#FFFFFF',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,tflite,traineddata,json,woff2}'],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        navigateFallback: '/index.html',
      },
    }),
  ],
})
