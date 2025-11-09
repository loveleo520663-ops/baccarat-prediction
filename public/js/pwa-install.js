// PWA 安裝與註冊管理
let deferredPrompt;
let isInstalled = false;

// 檢查是否已安裝為 PWA
function checkIfInstalled() {
  // iOS Safari
  if (window.navigator.standalone === true) {
    isInstalled = true;
    console.log('✅ 已安裝為 iOS PWA');
    return true;
  }
  
  // Android Chrome
  if (window.matchMedia('(display-mode: standalone)').matches) {
    isInstalled = true;
    console.log('✅ 已安裝為 Android PWA');
    return true;
  }
  
  console.log('ℹ️ 尚未安裝為 PWA');
  return false;
}

// 註冊 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker 註冊成功:', registration.scope);
        
        // 檢查更新
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 發現新版本');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('✨ 新版本已準備就緒');
              // 可以顯示更新通知
              showUpdateNotification();
            }
          });
        });
      })
      .catch(error => {
        console.error('❌ Service Worker 註冊失敗:', error);
      });
  });
}

// 顯示更新通知
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.className = 'update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <p>🎉 新版本已就緒</p>
      <button onclick="window.location.reload()">立即更新</button>
    </div>
  `;
  document.body.appendChild(notification);
  
  // 添加樣式
  const style = document.createElement('style');
  style.textContent = `
    .update-notification {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideUp 0.3s ease-out;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateX(-50%) translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    }
    
    .update-content {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .update-content p {
      margin: 0;
      font-weight: 600;
    }
    
    .update-content button {
      background: white;
      color: #667eea;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    
    .update-content button:hover {
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);
}

// 監聽安裝提示事件 (Android)
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('💡 顯示安裝提示');
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

// 顯示安裝按鈕
function showInstallButton() {
  // 檢查是否已安裝
  if (checkIfInstalled()) {
    hideInstallButton();
    return;
  }
  
  // 優先使用頁面中的內嵌按鈕 (登入頁面)
  const inlineBtn = document.getElementById('pwaInstallBtn');
  if (inlineBtn) {
    inlineBtn.style.display = 'flex';
    inlineBtn.onclick = installPWA;
    return;
  }
  
  // 如果沒有內嵌按鈕,則創建浮動按鈕 (其他頁面)
  const installBtn = document.createElement('button');
  installBtn.className = 'pwa-install-btn';
  installBtn.innerHTML = '📱 安裝 APP';
  installBtn.onclick = installPWA;
  
  document.body.appendChild(installBtn);
  
  // 添加樣式
  const style = document.createElement('style');
  style.textContent = `
    .pwa-install-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.2);
      padding: 12px 24px;
      border-radius: 25px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      transition: all 0.3s ease;
      animation: pulse 2s infinite;
    }
    
    .pwa-install-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      border-color: rgba(255, 255, 255, 0.3);
    }
    
    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }
    
    @media (max-width: 768px) {
      .pwa-install-btn {
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        right: auto;
      }
    }
  `;
  document.head.appendChild(style);
}

// 隱藏安裝按鈕
function hideInstallButton() {
  const inlineBtn = document.getElementById('pwaInstallBtn');
  const floatingBtn = document.querySelector('.pwa-install-btn');
  
  if (inlineBtn) {
    inlineBtn.style.display = 'none';
  }
  if (floatingBtn) {
    floatingBtn.remove();
  }
}

// 執行安裝
async function installPWA() {
  if (!deferredPrompt) {
    // iOS 用戶顯示手動安裝指引
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      showIOSInstallGuide();
    }
    return;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`用戶選擇: ${outcome}`);
  
  if (outcome === 'accepted') {
    console.log('✅ 用戶接受安裝');
    // 移除安裝按鈕
    const inlineBtn = document.getElementById('pwaInstallBtn');
    const floatingBtn = document.querySelector('.pwa-install-btn');
    
    if (inlineBtn) {
      inlineBtn.style.display = 'none';
    }
    if (floatingBtn) {
      floatingBtn.remove();
    }
  }
  
  deferredPrompt = null;
}

// iOS 安裝指引
function showIOSInstallGuide() {
  const guide = document.createElement('div');
  guide.className = 'ios-install-guide';
  guide.innerHTML = `
    <div class="guide-overlay" onclick="this.parentElement.remove()"></div>
    <div class="guide-content">
      <h3>📱 安裝到主畫面</h3>
      <ol>
        <li>點擊下方的 <strong>分享</strong> 按鈕 <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23007AFF'%3E%3Cpath d='M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z'/%3E%3C/svg%3E" style="width:20px;height:20px;vertical-align:middle;"></li>
        <li>選擇 <strong>「加入主畫面」</strong></li>
        <li>點擊 <strong>「新增」</strong></li>
      </ol>
      <button onclick="this.parentElement.parentElement.remove()">知道了</button>
    </div>
  `;
  
  document.body.appendChild(guide);
  
  // 添加樣式
  const style = document.createElement('style');
  style.textContent = `
    .ios-install-guide {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10001;
    }
    
    .guide-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
    }
    
    .guide-content {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      border-radius: 20px 20px 0 0;
      padding: 30px;
      animation: slideUpGuide 0.3s ease-out;
    }
    
    @keyframes slideUpGuide {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }
    
    .guide-content h3 {
      margin: 0 0 20px 0;
      color: #1a1a1a;
      font-size: 1.5rem;
    }
    
    .guide-content ol {
      margin: 0 0 20px 0;
      padding-left: 20px;
      color: #333;
      line-height: 2;
    }
    
    .guide-content li {
      margin-bottom: 10px;
    }
    
    .guide-content button {
      width: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 15px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

// 監聽安裝成功事件
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA 安裝成功!');
  isInstalled = true;
  hideInstallButton();
});

// 初始化檢查 - 頁面載入時立即執行
window.addEventListener('DOMContentLoaded', () => {
  console.log('🔍 檢查 PWA 安裝狀態...');
  
  // 立即檢查是否已安裝
  if (checkIfInstalled()) {
    hideInstallButton();
  } else {
    // 未安裝則確保按鈕可見
    const inlineBtn = document.getElementById('pwaInstallBtn');
    if (inlineBtn) {
      inlineBtn.style.display = 'flex';
      inlineBtn.onclick = installPWA;
      console.log('✅ PWA 安裝按鈕已啟用');
    }
  }
});

console.log('✅ PWA 腳本已載入');
