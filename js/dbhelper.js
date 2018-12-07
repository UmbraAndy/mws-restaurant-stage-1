/**
 * Common database helper functions.
 */

//db 
this.dbPromised = null;
this.restaurant_store = 'restaurant-store';
this.review_store = 'review_store';
this.favourite_store = 'favourite_store';
this.restaurant_key =  'restaurantId';
class DBHelper {


  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 8000 // Change this to your server port
    const serverPort = '1337';
    //return `http://localhost:${port}/data/restaurants.json`;
    //return './data/restaurants.json';
    return `http://localhost:${serverPort}/restaurants/`;
  }




  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    //setup database if it does nort exist;
    if (this.dbPromised == null) {
      this.dbPromised = idb.open('restaurant-db', 2, upgradeDB => {
        switch (upgradeDB.oldVersion) {
          case 0:// this is the very first verison
            upgradeDB.createObjectStore(restaurant_store, { keyPath: 'id' });
          case 1:// cater for favourite and review
          upgradeDB.createObjectStore(review_store, { keyPath: 'restaurant_id' });
          upgradeDB.createObjectStore(favourite_store, { keyPath: restaurant_key });
        }
      })
    }

    //first fetch data from db. if no data from db, then fetch from server;
    let tx = this.dbPromised.then(db => {
      let readAllTransaction = db.transaction(restaurant_store,'readonly');
      let restaurantStore = readAllTransaction.objectStore(restaurant_store);
      restaurantStore.getAll().then(restaurants => {
        //console.log("DBREST:" + restaurants.length);
        if (restaurants != null  &&  (restaurants.length > 0)) {// data in db.
          callback(null, restaurants);
        }
        else {// data not in db so fetch from server
          let xhr = new XMLHttpRequest();
          xhr.open('GET', DBHelper.DATABASE_URL);
          xhr.onload = () => {
            if (xhr.status === 200) { // Got a success response from server!
              const json = JSON.parse(xhr.responseText);
              const restaurants = json;
              //save json to DB
              let writeAllTransaction = db.transaction(restaurant_store, 'readwrite');
              let restaurantStoreForPut =  writeAllTransaction.objectStore(restaurant_store);
              restaurants.forEach(restaurantItem =>{
                restaurantStoreForPut.put(restaurantItem);
              });
              writeAllTransaction.complete;

              callback(null, restaurants);
            } else { // Oops!. Got an error from server.
              const error = (`Request failed. Returned status of ${xhr.status}`);
              callback(error, null);
            }
          };
          xhr.send();
        }
        readAllTransaction.complete;
      });
    });


  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  static markAsFavourite(restaurantId,markedBool){
    //mark in db first
    return this.dbPromised.then(db => {
      let tx = db.transaction(restaurant_store,'readwrite');
      let store = tx.objectStore(restaurant_store);
      return this.addToPendingFavoutites(restaurantId,markedBool)
    })
    // return fetch(DBHelper.DATABASE_URL+restaurantId+"/?is_favorite="+markedBool,{
    //   method:"PUT",
    //   mode:"cors",
    //   headers:{
    //       "Content-Type": "application/json; charset=utf-8"
    //   }
    // })
  }


  static  getPendingFavourites(params) {
      
  }

  static  addToPendingFavoutites(restaurantId,markedBool) {
    return this.dbPromised.then(db => {
      let tx = db.transaction([restaurant_store,favourite_store],'readwrite');
      let restaurantStore = tx.objectStore(restaurant_store);
      let favouriteStore = tx.objectStore(favourite_store);
      return restaurantStore.get(parseInt(restaurantId))
                  .then((restaurantObject)=>{
                    //console.log("INTRX FAV "+ markedBool);
                    restaurantObject.is_favorite = (markedBool == 'true' || markedBool) ? true : false;
                    //console.log("AFTERCHANGE " + restaurantObject.is_favorite );
                    restaurantStore.put(restaurantObject);  
                    const favourite = {'restaurantId': parseInt(restaurantId), 'value':markedBool}
                    favouriteStore.put(favourite);
                    return tx.complete;                  
                  })
    })    
  }

  static addToPendingReviews(review){
    return this.dbPromised.then(db=>{
      let tx = db.transaction(review_store,'readwrite');
      let reviewStore =  tx.objectStore(review_store);
      reviewStore.put(review);
      return tx.complete;
    })
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    let phoroUrl =  restaurant.photograph ? `${restaurant.photograph}.jpg` : 'icon_512.png'
    return (`img/${phoroUrl}`);// removed starting / to cater for github pages
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }


  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

