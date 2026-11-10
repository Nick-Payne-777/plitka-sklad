self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Просто пропускаем все запросы, ничего не кэшируем
});