// 百家樂預測系統 - Service Worker
const CACHE_NAME = 'baccarat-v1.0.0';
const urlsToCache = [
  '/',
  '/login',
  '/dashboard',
  '/prediction',
  '/admin',
  '/css/common.css',
  '/css/login.css',
  '/css/dashboard.css',
  '/css/admin.css',
  '/css/prediction.css',
  '/js/common.js',
  '/js/login.js',
  '/js/dashboard.js',
  '/js/admin.js',
  '/js/prediction.js',
  '/images/favicon.png',
  '/images/icon-192.png',
  '/images/icon-512.png'
];

// 安裝 Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] 安裝中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] 快取檔案');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[Service Worker] 快取失敗:', err);
      })
  );
  self.skipWaiting();
});

// 啟動 Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] 啟動中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 攔截請求
self.addEventListener('fetch', event => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') {
    return;
  }

  // 對於 API 請求,優先使用網路
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 複製回應並存入快取
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // 網路失敗,嘗試從快取取得
          return caches.match(event.request);
        })
    );
    return;
  }

  // 對於其他請求,優先使用快取
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          console.log('[Service Worker] 從快取返回:', event.request.url);
          return response;
        }

        console.log('[Service Worker] 從網路獲取:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // 檢查是否為有效回應
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 複製回應並存入快取
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          });
      })
  );
});

// 後台同步
self.addEventListener('sync', event => {
  console.log('[Service Worker] 後台同步:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  try {
    // 這裡可以加入需要同步的資料
    console.log('[Service Worker] 資料同步完成');
  } catch (error) {
    console.error('[Service Worker] 資料同步失敗:', error);
  }
}

// 推送通知 (未來可擴展)
self.addEventListener('push', event => {
  console.log('[Service Worker] 收到推送通知');
  const options = {
    body: event.data ? event.data.text() : '百家樂預測系統通知',
    icon: '/images/icon-192.png',
    badge: '/images/favicon.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('百家樂預測系統', options)
  );
});
