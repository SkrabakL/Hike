var app = angular.module('controllers');

app.controller('TrailsMapController', ['$rootScope', '$scope', 'GoogleMaps', '$ionicSideMenuDelegate', 'FilterTrailsService', function ($rootScope, $scope, GoogleMaps, $ionicSideMenuDelegate, FilterTrailsService) {
	var mapUpdatedTime;

    $scope.$on("$ionicView.enter", function () {
        $rootScope.lastMainState = 'trails.map';
        $ionicSideMenuDelegate.canDragContent(false);

	    if (!mapUpdatedTime || mapUpdatedTime < FilterTrailsService.getLastFilteredTime()) {
		    $scope.filteredTrails = FilterTrailsService.getFilteredTrails();
		    var mapElement = angular.element(document.querySelector("#trails-map"));
		    mapElement.empty();
		    GoogleMaps.init($scope.filteredTrails, "trails-map");
		    mapUpdatedTime = new Date();
	    }
    });

    $scope.$on("$ionicView.leave", function () {
        $ionicSideMenuDelegate.canDragContent(true);
    });
}]);
