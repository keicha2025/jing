import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'favicon.svg'],
            manifest: {
                name: 'Personal Audio Player',
                short_name: 'AudioPlayer',
                description: 'A premium personal audio player with 3s skip and playback speed control.',
                theme_color: '#4f46e5',
                start_url: './',
                display: 'standalone',
                background_color: '#171717',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'favicon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any'
                    }
                ]
            }
        })
    ],
    base: './',
    server: {
        host: true,
        port: 5173,
        hmr: {
            clientPort: 443,
        },
        allowedHosts: true
    }
})
