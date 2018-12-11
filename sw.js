self.importScripts('./js/idb.js');
self.importScripts('./js/dbhelper.js');
const localCacheName = 'restaurant-v140';
const PREFIX_PATH = ".";

self.addEventListener('install', installEvent => {
    console.log('Starting install');
    const urlsRequestsToCache = [
        PREFIX_PATH + '/img/icon_512.png',
        PREFIX_PATH + '/img/icon_192.png',
        PREFIX_PATH + '/',
        PREFIX_PATH + '/index.html',
        PREFIX_PATH + '/restaurant.html',
        PREFIX_PATH + '/css/styles.css',
        PREFIX_PATH + '/js/dbhelper.js',
        PREFIX_PATH + '/js/main.js',
        PREFIX_PATH + '/js/restaurant_info.js',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
        'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js'
    ]

    //create cache 
    installEvent.waitUntil(
        caches.open(localCacheName)
            .then(cache => {
                console.log('Cache created');
                return cache.addAll(urlsRequestsToCache);
            })
            .catch(error => {
                console.log(error);
            })
    );

});


self.addEventListener('activate', activateEvent => {
    console.log('SW activated');
    //loop through caches and delete old ones
    caches.keys()
        .then(cacheKeys => {
            cacheKeys.map(cacheName => {
                console.log('Cache name : ' + cacheName);
                if (cacheName != localCacheName) {
                    caches.delete(cacheName);
                }
            })

        })
});


self.addEventListener('fetch', fetchEvent => {
    const request = fetchEvent.request;
    fetchEvent.respondWith(
        caches.match(request, { ignoreSearch: true })
            .then(cacheResponse => {
                if (cacheResponse) return cacheResponse;
                return fetch(request)
                    .then(serverResponse => {
                        //catch request/response from server fetch
                        return caches.open(localCacheName)
                            .then(cache => {
                                const method = request.method;
                                if (method == "POST" || method == "PUT") return serverResponse;//POST and PUT should not be cached
                                cache.put(request, serverResponse.clone());
                                return serverResponse;
                            })
                    });
            })
    )
})

self.addEventListener('sync', function (event) {
    const syncTag = event.tag;
    if (syncTag.startsWith('favouriteSync-')) {
        //obtain id of restaurant
        const restaurantId = syncTag.substr(syncTag.indexOf('-') + 1);
        event.waitUntil(sendFavourite(restaurantId).then(resultJson => {
            const restaurantName = resultJson.name;
            let markedMsg = 'marked'
            if (resultJson.is_favorite == "false" || resultJson.is_favorite == false) {
                markedMsg = 'unmarked'
            }
            self.registration.showNotification("Restaurant '" + restaurantName + "' " + markedMsg + " as  favorite");
        }));
    }
    else if (syncTag.startsWith('reviewSync-')) {
        //obtain id of review
        const reviewId = syncTag.substr(syncTag.indexOf('-') + 1);
        event.waitUntil(sendReview(reviewId)
            .then((resultJson) => {
                return DBHelper.addReview(resultJson);
            })
            .then(() => {
                self.registration.showNotification("Review synced to server for.");
            })
        );
    }
});

//handle message event
self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaitingStage') {
        self.skipWaiting();
        console.log('SW skipWaiting');
    }
})

sendFavourite = (restaurantId) => {
    //fetch favourite and send to server
    DBHelper.initDB();
    return DBHelper.getPendingFavourites(restaurantId).then(restaurantFavourite => {
        const url = 'http://localhost:1337/restaurants/' + restaurantId + '/?is_favorite=' + restaurantFavourite.value;
        console.log('FAV URL:' + url);
        return fetch(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
        }).then(serverResponse => {
            deleteSyncedFavourite(restaurantId);
            return serverResponse.json()
        })
    })
}

sendReview = (reviewId) => {
    //fetch review and send to server
    DBHelper.initDB();
    return DBHelper.getPendingReview(reviewId).then(review => {
        const data = JSON.stringify(review);
        return fetch('http://localhost:1337/reviews/', {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: data
        }).then(serverResponse => {
            deleteSyncedReview(reviewId);
            return serverResponse.json()
        })
    })
}

addReviewToDB = (review) => {
    DBHelper.initDB();
    DBHelper.addReview(review);
}

deleteSyncedReview = (reviewId) => {
    DBHelper.initDB();
    DBHelper.deletPendingReview(reviewId);
}


deleteSyncedFavourite = (resturantId) => {
    DBHelper.initDB();
    DBHelper.deletPendingFavourite(resturantId);
}