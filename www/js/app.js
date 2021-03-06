var app = angular.module('app', ['ionic', 'ngCordova', 'ngSanitize', 'controllers', 'services', 'directives']);
var db = null; // eslint-disable-line no-unused-vars

app.run(function($rootScope, $ionicPlatform, $ionicHistory, $ionicPopup) {
  $ionicPlatform.ready(function() {
    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if (window.cordova && StatusBar) {
      if (ionic.Platform.isAndroid()) {
        StatusBar.backgroundColorByHexString('#28A54C');
      } else {
        StatusBar.styleBlackTranslucent();
      }
    }
  });

  $ionicPlatform.registerBackButtonAction(function(e) {
    if ($ionicHistory.backView()) {
      $ionicHistory.goBack();
    } else if ($rootScope.searchBarActive) {
      $rootScope.$broadcast('hide-search-bar-request', {});
    } else {
      var exitAppPopup = $ionicPopup.confirm({
        template: 'Exit Hiking Vancouver?',
        cancelText: 'CANCEL',
        cancelType: 'button-light',
        okText: 'EXIT',
        okType: 'button-light',
      });
      exitAppPopup.then(function(res) {
        if (res) {
          ionic.Platform.exitApp();
        }
      });
    }
    e.preventDefault();
    return false;
  }, 101);
});

app.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {

  $stateProvider
    .state('/start', {
      url: '/',
      templateUrl: 'start.html',
    })

    .state('trails', {
      url: '/trails',
      abstract: true,
      templateUrl: 'views/trails/index.html',
      controller: 'TrailsController',
    })
    .state('trails.list', {
      url: '/list',
      templateUrl: 'views/trails/list.html',
      controller: 'TrailsListController',
    })
    .state('trails.map', {
      url: '/map',
      templateUrl: 'views/trails/map.html',
      controller: 'TrailsMapController',
    })

    .state('trail', {
      url: '/trail/:name',
      abstract: true,
      cache: false,
      templateUrl: 'views/trail/index.html',
      controller: 'TrailController',
    })
    .state('trail.details', {
      url: '/list',
      views: {
        'trail-details-tab': {
          templateUrl: 'views/trail/details.html',
          controller: 'TrailDetailsController',
        },
      },
    })
    .state('trail.photos', {
      url: '/photos',
      views: {
        'trail-photos-tab': {
          templateUrl: 'views/trail/photos.html',
          controller: 'TrailPhotosController',
        },
      },
    })

    .state('favourites', {
      url: '/favourites',
      templateUrl: 'views/favourites.html',
      controller: 'FavouritesController',
    })

    .state('nearby', {
      url: '/nearby',
      templateUrl: 'views/nearby.html',
      controller: 'NearbyController',
    })

    .state('about', {
      url: '/about',
      templateUrl: 'views/about.html',
      controller: 'AboutController',
    });

  $urlRouterProvider.otherwise('/start');


  //Tab style
  $ionicConfigProvider.tabs.style('striped');

  // Tab position
  $ionicConfigProvider.tabs.position('top');

  //Use native scrolling
  if (ionic.Platform.isAndroid()) {
    $ionicConfigProvider.scrolling.jsScrolling(false);
  }
});

//For general app wide functionality
app.controller('StartController', ['$rootScope', '$scope', '$state', '$ionicSideMenuDelegate', '$ionicScrollDelegate', '$ionicPopup', 'TrailsService', 'RegionsService', 'CitiesService', 'ParksService', 'FavouritesService', '$ionicPlatform', '$ionicLoading', '$cordovaSQLite', '$cordovaSplashscreen', '$q', '$ionicHistory', '$http', 'DatabaseVersioning', function($rootScope, $scope, $state, $ionicSideMenuDelegate, $ionicScrollDelegate, $ionicPopup, TrailsService, RegionsService, CitiesService, ParksService, FavouritesService, $ionicPlatform, $ionicLoading, $cordovaSQLite, $cordovaSplashscreen, $q, $ionicHistory, $http, DatabaseVersioning) {
  async function openDatabase() {
    db = $cordovaSQLite.openDB('trails.db');
    await DatabaseVersioning.update();
    getAndCombineData();
  }

  function createObjectIdAsKey(array) {
    var result = {};
    array.forEach(function(item) {
      result[item.id] = item;
    });
    return result;
  }

  function getAndCombineData() {
    const trailsPromise = TrailsService.getAllTrails();
    const regionsPromise = RegionsService.getAll();
    const citiesPromise = CitiesService.getAll();
    const parksPromise = ParksService.getAll();
    const favouritesPromise = FavouritesService.getFavourites();

    Promise.all([trailsPromise, regionsPromise, citiesPromise, parksPromise, favouritesPromise]).then(res => {
      const [trailsData, regionsData, citiesData, parksData, favouritesData] = res;
      const regions = createObjectIdAsKey(regionsData);
      const cities = createObjectIdAsKey(citiesData);
      const parks = createObjectIdAsKey(parksData);

      const favouriteIds = extractFavouritesIds(favouritesData);

      trailsData.forEach(function(trail) {
        // Enrich trail with City Name
        const matchingCity = cities[trail.cityId];
        trail.cityName = matchingCity.name;

        // Enrich trail with Region Name and Id
        const matchingRegion = regions[matchingCity.regionId];
        trail.regionId = matchingRegion.id;
        trail.regionName = matchingRegion.name;

        // Enrich trail with favourite
        trail.favourite = favouriteIds.indexOf(trail.id) > -1;
      });

      $scope.trailsIndex = createTrailsIndex(trailsData);
      $scope.trails = trailsData;
      $scope.regions = regions;
      $scope.cities = cities;
      $scope.parks = parks;
      $scope.favouriteIds = favouriteIds;

      $scope.goState('trails.list');

      setTimeout(function() {
        $cordovaSplashscreen.hide();
        DatabaseVersioning.deferredUpdate();
      }, 300);
    }, () => {
      $scope.failedPopupReload();
    });
  }

  function createTrailsIndex(trailsData) {
    const trailsIndex = {};
    trailsData.forEach(function(trail, index) {
      trailsIndex[trail.id] = index;
    });
    return trailsIndex;
  }

  function extractFavouritesIds(favouritesData) {
    const favouritesDataArrayArray = [];
    favouritesData.forEach(function(favourite) {
      favouritesDataArrayArray.push([favourite.id, favourite.trailId]);
    });

    //Sort ids by order added (ascending)
    const sortedFavouritesData = favouritesDataArrayArray.sort((a, b) => a[0] - b[0]);

    const result = [];
    sortedFavouritesData.forEach(function(favourite) {
      result.push(favourite[1]);
    });

    return result;
  }

  $ionicPlatform.ready(function() {
    $rootScope.credentials = {};
    $http.get('assets/credentials.json').then(function(response) {
      const data = response && response.data;
      if (!data) return;
      const emailJsUser = data.emailJsUser || '';
      const emailJsTemplateId = data.emailJsTemplateId || '';
      const googleApiKey = data.googleApiKey || '';
      const googleAnalytics = data.googleAnalytics || '';
      const amazonS3Base = data.amazonS3Base || '';

      if (typeof emailjs !== 'undefined' && emailJsUser && emailJsTemplateId) {
        $rootScope.credentials.emailJsUser = emailJsUser;
        $rootScope.credentials.emailJsTemplateId = emailJsTemplateId;
      }

      $rootScope.credentials.googleApiKey = googleApiKey;

      if (typeof analytics !== 'undefined' && googleAnalytics) {
        analytics.startTrackerWithId(googleAnalytics);
        analytics.trackView('Splash Screen');
      }

      $rootScope.credentials.amazonS3Base = amazonS3Base;

      if (window.cordova) {
        window.plugins.sqlDB.copy('trails.db', 0, openDatabase, openDatabase);
      }
    });
  });

  $scope.$on('$ionicView.beforeEnter', function() {
    $ionicSideMenuDelegate.canDragContent(true);
  });

  $rootScope.searchBarActive = false;

  $scope.goState = function(state, disableBack) {
    if (disableBack) {
      $ionicHistory.nextViewOptions({
        disableBack: true,
      });
    }
    $state.go(state);
  };

  $scope.goBackState = function() {
    $scope.goState($rootScope.lastMainState, true);
  };

  $scope.scrollToTop = function() {
    $ionicScrollDelegate.scrollTop();
  };

  $scope.failedPopup = function(message, redirectTo) {
    var errorMessage = message ? message : 'An unexpected error occurred';
    var goToState = redirectTo ? redirectTo : 'trails.list';
    var failedPopup = $ionicPopup.alert({
      template: errorMessage,
      //template:
    });
    failedPopup.then(function() {
      $state.go(goToState);
    });
  };

  $scope.failedPopupReload = function() {
    $scope.failedPopupReload('An unexpected error occurred');
  };

  $scope.failedPopupReload = function(message) {
    var failedPopup = $ionicPopup.alert({
      template: message,
      //template:
    });
    failedPopup.then(function() {
      window.location.reload(true);
    });
  };

  $scope.noConnectionAlert = function(message, successCallback) {
    message = message ? message : '';
    var noConnectionAlert = $ionicPopup.alert({
      template: message + ' Check your connection and try again.',
      okType: 'button-light',
      cssClass: 'no-connection-alert',
    });

    noConnectionAlert.then(function() {
      if (successCallback) {
        successCallback();
      }
    });
  };

  $rootScope.$on('event:add-favourite', function(event, args) {
    const addTrailId = args.id;
    const indexOfTrail = $scope.trailsIndex[addTrailId];
    $scope.trails[indexOfTrail].favourite = true;

    $scope.favouriteIds.push(addTrailId);
  });

  $rootScope.$on('event:remove-favourite', function(event, args) {
    const removeTrailId = args.id;
    const indexOfTrail = $scope.trailsIndex[removeTrailId];
    $scope.trails[indexOfTrail].favourite = false;

    $scope.favouriteIds = $scope.favouriteIds.filter(favouriteId => favouriteId !== removeTrailId);
  });
}]);


app.filter('BoolToString', function() {
  return function(bool) {
    return bool ? 'Yes' : 'No';
  };
});

app.filter('ConvertDistanceCategoryToString', function() {
  return function(categoryInt) {
    if (categoryInt === 0) return 'One-Way';
    if (categoryInt === 1) return 'Round-Trip';
  };
});

app.filter('hrefToJS', function($sce, $sanitize) {
  return function(text) {
    var regex = /href="([\S]+)"/g;
    var newString = $sanitize(text).replace(regex, 'href onClick="window.open(\'$1\', \'_system\');return false;"');
    return $sce.trustAsHtml(newString);
  };
});

app.filter('HumanizeDifficulty', function() {
  return function(int) {
    var difficultyScale = ['Easy', 'Moderate', 'Hard', 'Very Hard'];
    return difficultyScale[int];
  };
});

app.filter('HumanizeSeason', function() {
  return function(input) {
    var monthNameArray = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var parts = input.split('-', 2);
    var fromMonth = parseInt(parts[0]);
    var toMonth = parseInt(parts[1]);
    return ((fromMonth === 1 && toMonth === 12) || (fromMonth > toMonth && fromMonth - 1 === toMonth)) ?
      'Year-round' : monthNameArray[fromMonth - 1] + ' - ' + monthNameArray[toMonth - 1];
  };
});

app.filter('ProcessElevationToString', function() {
  return function(elevation) {
    return Math.abs(elevation) < 100 ? 'minimal' : Math.abs(elevation) + 'm';
  };
});