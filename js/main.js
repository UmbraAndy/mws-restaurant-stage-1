let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []
//make it empty for local testing for github pages use /mws-restaurant-stage-1
const PREFIX_PATH = ".";//"/mws-restaurant-stage-1";
/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
  registerServiceworker();
});


registerServiceworker = () => {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register(PREFIX_PATH + '/sw.js', { scope: PREFIX_PATH + '/' })
    .then(serviceWorkerRegistration => {
      //check to see if page was loaded by sw. if it wasnt, no need to check for sw states
      if (!navigator.serviceWorker.controller) {
        return;
      }

      //a sw is in waiting state
      if (serviceWorkerRegistration.waiting) {
        //notify the user
        notifyUI();
        return
      }

      // a sw is in insalling state
      if (serviceWorkerRegistration.installing) {
        monitorServiceWorkerState(serviceWorkerRegistration.installing);
        return;
      }

      //if future update found
      serviceWorkerRegistration.addEventListener('updatefound', () => {
        monitorServiceWorkerState(serviceWorkerRegistration.installing);
      })

      //add event to check if new sw has taken over current page
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
        console.log('Page reloaded');
      })
    });
  // //register for favourite sync
  // navigator.serviceWorker.ready.then((regitration) => {
  //   console.log("fav sync registration");
  //   return regitration.sync.register('favouriteSync')
  // })

  // //register for review sync
  // navigator.serviceWorker.ready.then((regitration) => {
  //   console.log("review sync registration");
  //   return regitration.sync.register('reviewSync')
  // })

}

notifyUI = (serviceWorker) => {
  console.log('New update found in waiting');
  showSnackBar();
  var updateLink = document.getElementById("update_btn");
  updateLink.onclick = () => {
    console.log("Requesting update");
    serviceWorker.postMessage({ action: 'skipWaitingStage' });
  }

}

monitorServiceWorkerState = (serviceWorker) => {
  //check for state changes in the sw. If it changes to installed, nofify the UI
  serviceWorker.addEventListener('statechange', () => {
    if (serviceWorker.state == 'installed') {
      notifyUI(serviceWorker)
    }
  })
}

dismissSnackBar = () => {
  var snackbar = document.getElementById("snackbar");
  snackbar.className = "";
}

showSnackBar = () => {
  var snackbar = document.getElementById("snackbar");
  console.log("Show snack");
  snackbar.className = "show";
}
/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoidW1icmFqYXZhIiwiYSI6ImNqa250bXI2eDFkNnczcW1nZ296ajJrOHcifQ.J5kKFOd3UMJyR_3_YqBo1A',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

//splice density reation into image url
function spliceDensityIntoImageUrl(url, density) {
  url = url.replace(".jpg", density + ".jpg");
  return url;
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  let baseSrc = DBHelper.imageUrlForRestaurant(restaurant);
  image.src = spliceDensityIntoImageUrl(baseSrc, "-1x");
  /**
   * Set the image attrtibutes for srcset and size
   */
  image.srcset = spliceDensityIntoImageUrl(baseSrc, "-1x") + " 1x, " + spliceDensityIntoImageUrl(baseSrc, "-2x") + " 2x";

  //set alt tag for image
  image.alt = "Image of " + restaurant.name;
  li.append(image);

  const name = document.createElement('h2');
  //add favourite to end of  name
  const favouriteChk = document.createElement('input');
  favouriteChk.setAttribute('type', 'checkbox')
  favouriteChk.setAttribute('data-id', restaurant.id)
  favouriteChk.addEventListener('click', (event) => {
    const checkBox = event.target;
    const restaurantId = checkBox.getAttribute('data-id');
    markFavourite(restaurantId, checkBox.checked).then(() => {
      doFavouriteBackgroundSync();
    });
  })
  //marke as checked if is favourite
  favouriteChk.checked = (restaurant.is_favorite == 'true' || restaurant.is_favorite) ? true : false;
  name.innerHTML = restaurant.name;
  name.append(favouriteChk);
  li.append(name);


  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('arial-label', 'View detail for ' + restaurant.name);
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}


markFavourite = (restaurantId, markBool) => {
  return DBHelper.markAsFavourite(restaurantId, markBool);
}

doFavouriteBackgroundSync=() =>{
  if('SyncManager' in window){
    navigator.serviceWorker.ready.then(function(swRegistration) {
      swRegistration.sync.register('favouriteSync');
    })
  }
}
/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

