var app = angular.module('services');

app.factory('GoogleMaps', ['$cordovaGeolocation', '$ionicLoading', '$rootScope', '$cordovaNetwork', 'ConnectivityMonitor', function ($cordovaGeolocation, $ionicLoading, $rootScope, $cordovaNetwork, ConnectivityMonitor) {

    var apiKey = false;
    var map = null;

    var trails = [];

    function initMap() {

        var latLong = new google.maps.LatLng(49.2827, -123.1207); //Lat long of Downtown Vancouver
        var zoom = 12;

        if(!trails || trails.length < 1) {
            $ionicLoading.show({
                template: 'An unexpected error occurred.'
            });
        }
        if (trails.length == 1) {
            latLong = new google.maps.LatLng(trails[0].lat, trails[0].long);
        }
        else if (trails.length > 1) {
            console.log("More than 1 trail to mark");
            //do something to calculate latLng on middle and the zoom ratio
            return;
        }

        var mapOptions = {
            center: latLong,
            zoom: zoom,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        map = new google.maps.Map(document.getElementById("map"), mapOptions);

        //Wait until the map is loaded
        google.maps.event.addListenerOnce(map, 'idle', function () {
            loadMarkers();
            enableMap();
        });
    }

    function enableMap() {
        $ionicLoading.hide();
    }

    function disableMap() {
        $ionicLoading.show({
            template: "You must be connected to the Internet to view this map."
        })
    }

    function loadGoogleMaps() {
        $ionicLoading.show({
            template: 'Loading Google Maps...'
        });

        //This function will be called once the SDK has been loaded
        window.mapInit = function () {
            initMap();
        };

        //Create a script element to insert Google JS Maps API into the page
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.id = "googleMaps";

        if (apiKey) {
            script.src = 'http://maps.google.com/maps/api/js?key=' + apiKey + '&sensor=true&callback=mapInit';
        }
        else {
            script.src = 'http://maps.google.com/maps/api/js?sensor=true&callback=mapInit';
        }

        document.body.appendChild(script);
    }

    function checkLoaded() {
        if (typeof google == "undefined" || typeof google.maps == "undefined") {
            loadGoogleMaps();
        }
        else {
            enableMap();
        }
    }

    function loadMarkers() {
        for (var i = 0; i < trails.length; i++) {
            var trail = trails[i];
            var markerPos = new google.maps.LatLng(trail.lat, trail.long);

            var marker = new google.maps.Marker({
                map: map,
                animation: google.maps.Animation.DROP,
                position: markerPos
            });

            var infoWindowContent = "<h4>" + trail.name + "</h4>";
            addInfoWindow(marker, infoWindowContent, trail);
        }
    }

    function addInfoWindow(marker, message, trail) {
        var infoWindow = new google.maps.InfoWindow({
            content: message
        });

        google.maps.event.addListener(marker, 'click', function () {
            infoWindow.open(map, marker);
        });
    }

    function addConnectivityListeners() {
        if (ionic.Platform.isWebView()) {
            //Check if the map is already loaded when user comes online, if not, load it
            $rootScope.$on('$cordovaNetwork:online', function (event, networkState) {
                checkLoaded();
            });

            //Disable the map when the user goes offline
            $rootScope.$on('$cordovaNetwork:offline', function (event, networkState) {
                disableMap();
            });
        }
        else {
            window.addEventListener("online", function (e) {
                checkLoaded();
            }, false);

            window.addEventListener("offline", function (e) {
                disableMap();
            }, false);
        }
    }

    return {
        init: function (arrayOfMarkers) {
            trails = arrayOfMarkers;
            apiKey = "AIzaSyClUi3fHwITYAL8qhel240O3r3scblMG8g";

            if (typeof google == "undefined" || typeof google.maps == "undefined") {
                console.warn("Google Maps SDK needs to be loaded");

                disableMap();

                if (ConnectivityMonitor.isOnline()) {
                    loadGoogleMaps();
                }
            }
            else {
                if (ConnectivityMonitor.isOnline()) {
                    initMap();
                    enableMap();
                }
                else {
                    disableMap();
                }
            }

            addConnectivityListeners();
        }
    }
}]);