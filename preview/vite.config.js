import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
            manifest: {
                name: 'Personal Audio Player',
                short_name: 'AudioPlayer',
                description: 'A premium personal audio player with 3s skip and playback speed control.',
                theme_color: '#4f46e5',
                start_url: '/jing/preview/',
                display: 'standalone',
                background_color: '#171717',
                icons: [
                    {
                        src: 'https://raw.githubusercontent.com/keicha2025/jing/refs/heads/main/preview/appicon.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    },
                    {
                        src: 'https://raw.githubusercontent.com/keicha2025/jing/refs/heads/main/preview/appicon.png',
                        sizes: '192x192',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    base: '/jing/preview/',
    server: {
        host: true,
        port: 5173,
        hmr: {
            clientPort: 443,
        },
        allowedHosts: true
    }
})
