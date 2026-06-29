// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 💡 Service Worker 登録モジュールの読み込み
import { registerSW } from 'virtual:pwa-register';

// 💡 自動でキャッシュ登録と更新の監視を実行
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('新しいバージョンのアプリが利用可能です。バックグラウンドで適用されました。');
  },
  onOfflineReady() {
    console.log('アプリのオフライン起動準備が完了しました！');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)