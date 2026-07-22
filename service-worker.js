const cacheName = "dm-financeira-v12";

const arquivos = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

// 1. INSTALAÇÃO: Baixa os novos arquivos do cache
self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(arquivos))
  );
  // Força o Service Worker novo a virar ativo imediatamente
  self.skipWaiting();
});

// 2. ATIVAÇÃO: Deleta todos os caches antigos (v1, v2... v9)
self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys().then(chaves => {
      return Promise.all(
        chaves.map(chave => {
          if (chave !== cacheName) {
            console.log("Removendo cache antigo:", chave);
            return caches.delete(chave);
          }
        })
      );
    })
  );
  // Garante que o app passe a usar o novo cache no mesmo instante
  return self.clients.claim();
});

// 3. BUSCA: Serve o cache ou busca na rede
self.addEventListener("fetch", evento => {
  evento.respondWith(
    caches.match(evento.request)
      .then(resposta => {
        return resposta || fetch(evento.request);
      })
  );
});
