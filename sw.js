const localCacheName = 'restaurant-v1';

self.addEventListener('install', installEvent =>{
    console.log('Starting install');
    const urlsRequestsToCache = [
        '/',
        '/index.html',
        '/restaurant.html',
        '/css/styles.css',
        '/js/dbhelper.js',
        '/js/main.js',
        '/js/restaurant_info.js',
        '/data/restaurants.json',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js'
    ]

    //create cache 
    installEvent.waitUntil(
        caches.open(localCacheName)
        .then(cache =>{
            console.log('Cache created');
            return cache.addAll(urlsRequestsToCache);
        })
        .catch(error =>{
            console.log(error);
        })
    );

});


self.addEventListener('activate',activateEvent =>{
    console.log('SW activated');
});


self.addEventListener('fetch',fetchEvent=>{
    const request = fetchEvent.request;
    fetchEvent.respondWith(
        caches.match(request)
        .then(response =>{
            if(response) return response;
            return fetch(request);
        })
    )
})