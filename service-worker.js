const cacheName = "dm-financeira-v4";


const arquivos = [

    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json",
    "./logo.png"

];



// INSTALAÇÃO

self.addEventListener("install", evento => {


    evento.waitUntil(

        caches.open(cacheName)

        .then(cache => {

            return cache.addAll(arquivos);

        })

    );


    self.skipWaiting();


});




// ATIVAÇÃO
// remove caches antigos

self.addEventListener("activate", evento => {


    evento.waitUntil(


        caches.keys()

        .then(chaves => {


            return Promise.all(


                chaves.map(chave => {


                    if(chave !== cacheName){

                        return caches.delete(chave);

                    }


                })


            );


        })


    );


    self.clients.claim();


});




// FUNCIONAMENTO OFFLINE

self.addEventListener("fetch", evento => {


    evento.respondWith(


        caches.match(evento.request)

        .then(resposta => {


            return resposta || fetch(evento.request);


        })


    );


});