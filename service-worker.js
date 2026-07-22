const cacheName = "dm-financeira-v21";

const arquivos = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

// Escuta a mensagem para ativar imediatamente sem aguardar o app ser fechado
self.addEventListener("message", evento => {
  if (evento.data && evento.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

// INSTALAÇÃO: Baixa os novos arquivos do cache
self.addEventListener("install", evento => {
  evento.waitUntil(
    caches.open(cacheName)
      .then(cache => cache.addAll(arquivos))
  );
  self.skipWaiting();
});

// ATIVAÇÃO: Limpa todos os caches antigos das versões anteriores
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
  return self.clients.claim();
});

// BUSCA: Serve do cache local ou vai buscar na rede
self.addEventListener("fetch", evento => {
  evento.respondWith(
    caches.match(evento.request)
      .then(resposta => {
        return resposta || fetch(evento.request);
      })
  );
});
