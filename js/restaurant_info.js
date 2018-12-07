let restaurant;
var newMap;
//make it empty for local testing for github pages use /mws-restaurant-stage-1
const PREFIX_PATH = "."; "/mws-restaurant-stage-1";
/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
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
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}


//splice density reation into image url
function spliceDensityIntoImageUrl(url, density) {
  url = url.replace(".", density + ".");
  return url;
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  //add favourite to end of  name
  const favouriteChk = document.createElement('input');
  favouriteChk.setAttribute('type', 'checkbox')
  favouriteChk.setAttribute('data-id', restaurant.id)
  name.innerHTML = restaurant.name;
  name.append(favouriteChk);
  name.tabIndex = 0;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  let baseSrc = DBHelper.imageUrlForRestaurant(restaurant);
  image.src = spliceDensityIntoImageUrl(baseSrc, "-1x");
  image.srcset = spliceDensityIntoImageUrl(baseSrc, "-1x") + " 1x, " + spliceDensityIntoImageUrl(baseSrc, "-2x") + " 2x";

  //set alt tag for image
  image.alt = "Image of " + restaurant.name;
  image.tabIndex = 0;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }


  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');

  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
    hours.tabIndex = 0;
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  //add form for review
  const reviewForm = document.createElement('form');
  const nameDiv = document.createElement('div');
  nameDiv.setAttribute('id', 'name-div');
  const ratingSelectDiv = document.createElement('div');
  ratingSelectDiv.setAttribute('id', 'rating-select-div')
  const ratingTexttDiv = document.createElement('div');
  reviewForm.setAttribute('id', 'review_form');
  const nameInput = document.createElement('input');
  nameInput.setAttribute('id', 'rating_name');
  nameInput.setAttribute('type','text');
  const ratingInput = document.createElement('select');
  for (var i = 1; i < 6; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.innerText = i;
    ratingInput.append(option);
  }
  const nameLabel = document.createElement('label');
  nameLabel.classList = 'review-labels';
  nameLabel.setAttribute('for', nameInput.getAttribute('id'));
  nameLabel.innerText = 'Name';  
  nameLabel.classList = 'review-labels';
  ratingInput.setAttribute('value', '1');
  ratingInput.setAttribute('id', 'rating')
  const ratingLabel = document.createElement('label');
  ratingLabel.classList = 'review-labels';
  ratingLabel.setAttribute('for', ratingInput.getAttribute('id'));
  ratingLabel.innerText = 'Rate this restaurant';
  nameDiv.append(nameLabel);
  nameDiv.append(nameInput);
  ratingSelectDiv.append(ratingLabel);
  ratingSelectDiv.append(ratingInput);
  const ratingText = document.createElement('textarea');
  ratingText.setAttribute('id', 'review_text');
  ratingText.setAttribute('rows', '4');
  const reviewTextLabel = document.createElement('label')
  reviewTextLabel.classList = 'review-labels';
  reviewTextLabel.setAttribute('for', 'review_text');
  reviewTextLabel.innerText = 'Comment'
  ratingTexttDiv.append(reviewTextLabel);
  ratingTexttDiv.append(ratingText);
  const postReviewButton = document.createElement('button');
  postReviewButton.setAttribute('id', 'post_button');
  postReviewButton.innerText = 'Post review';
  postReviewButton.addEventListener('click', event => {
    event.preventDefault();
    const date = Date.now();
    const review = {
      'restaurant_id': self.restaurant.id,
      'name': nameInput.value,
      'createdAt': date,
      'updatedAt': date,
      'rating': ratingInput.value,
      'comments':ratingText.value
    };
    console.log(review);
    DBHelper.addToPendingReviews(review).then(() =>{
      doReviewgroundSync();
    })
  })
  reviewForm.append(nameDiv);
  reviewForm.append(ratingSelectDiv);
  reviewForm.append(ratingTexttDiv);
  reviewForm.append(postReviewButton);
  container.append(reviewForm);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}


doReviewgroundSync=() =>{
  if('SyncManager' in window){
    navigator.serviceWorker.ready.then(function(swRegistration) {
      swRegistration.sync.register('REVSYNC');
    })
  }
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);
  li.tabIndex = 0;

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
