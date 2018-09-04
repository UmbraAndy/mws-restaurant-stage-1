const localCacheName = 'restaurant-v1';
//make it empty for local testing for github pages use /mws-restaurant-stage-1
const PREFIX_PATH = "/mws-restaurant-stage-1";
self.addEventListener('install', installEvent =>{
    console.log('Starting install');
    const urlsRequestsToCache = [
        PREFIX_PATH+'/',
        PREFIX_PATH+'/index.html',
        PREFIX_PATH+'/restaurant.html',
        PREFIX_PATH+'/css/styles.css',
        PREFIX_PATH+'/js/dbhelper.js',
        PREFIX_PATH+'/js/main.js',
        PREFIX_PATH+'/js/restaurant_info.js',
        PREFIX_PATH+'/data/restaurants.json',
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