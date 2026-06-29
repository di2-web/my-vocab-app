// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    /* 💡 PWA プラグインの追加 */
    VitePWA({
      registerType: 'autoUpdate', // アプリ更新時に自動でキャッシュを最新化する設定
      includeAssets: ['favicon.svg', 'icons/apple-icon-180.png'], // キャッシュ対象の追加アセット
      workbox: {
        // キャッシュ（オフライン保存）の対象となる静的アセットの拡張子
        globPatterns: ['**/*.{js,css,html,png,svg,json}'],
        
        // 💡 決定事項：「音声ファイル(mp3/m4a)はキャッシュせず、オンライン専用にする」ための除外設定
        globIgnores: ['audio/**/*', '**/audio/**/*']
      },
      manifest: {
        name: "My Vocab App",
        short_name: "Vocab",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#16171d",
        theme_color: "#aa3bff",
        description: "A modern English vocabulary learning app.",
        icons: [
          {
            "src": "/icons/icon-192.png",
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": "/icons/icon-512.png",
            "sizes": "512x512",
            "type": "image/png"
          }
        ]
      }
    })
  ]
});