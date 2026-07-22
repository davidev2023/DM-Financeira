const cacheName = "dm-financeira-v17";

const arquivos = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

// Escuta o comando enviado pelo app.js para assumir o controle imediatamente
self.addEventListener("message", evento => {
  if (evento.data && evento.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

// INSTALAÇÃO: Baixa os novos arquivos
self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(arquivos))
  );
  self.skipWaiting();
});

// ATIVAÇÃO: Apaga os caches antigos (v1 a v12)
self.addEventListener("activate", evento => {
  evento.waitUntil(
    caches.keys().then(chaves => {
      return Promise.all(
        chaves.map(chave => {
          if (chave !== cacheName) {
            console.log("Deletando cache antigo:", chave);
            return caches.delete(chave);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// BUSCA: Serve do cache ou busca na rede
self.addEventListener("fetch", evento => {
  evento.respondWith(
    caches.match(evento.request)
      .then(resposta => {
        return resposta || fetch(evento.request);
      })
  );
});
