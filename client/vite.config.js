import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'script-defer',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globIgnores: [
          '**/AccountPage-*.js',
          '**/AccountPage-*.css',
          '**/AuthPanel-*.js',
          '**/AuthPanel-*.css',
          '**/CarbonPage-*.js',
          '**/CarbonPage-*.css',
          '**/DecorativePattern-*.js',
          '**/DecorativePattern-*.css',
          '**/InteractiveMap-*.js',
          '**/InteractiveMap-*.css',
          '**/LegalPage-*.js',
          '**/LegalPage-*.css',
          '**/NotFoundPage-*.js',
          '**/NotFoundPage-*.css',
          '**/MapPin.es-*.js',
          '**/maplibre-gl-worker-*.js',
          '**/auto-*.js',
          '**/authApi-*.js',
          '**/completedJourneysDb-*.js',
          '**/favoritesApi-*.js',
          '**/idfmApi-*.js',
        ],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'urbanflow-lazy-assets',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/basemaps\.cartocdn\.com\/.*\.(?:png|jpg|webp)(?:\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'carto-map-tiles',
              expiration: {
                maxEntries: 600,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      manifest: {
        name: 'UrbanFlow Mobility',
        short_name: 'UrbanFlow',
        description: 'Application web de mobilité urbaine éco-conçue.',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
