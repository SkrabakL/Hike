var app = angular.module('services');

//TODO: WRITE TESTS for these queries

app.service('FavouritesService', ['Database', function(Database){
    var self = this;

    self.getFavourites = function() {
        var queryString = "SELECT * FROM favourites";
        return Database.query(queryString)
            .then(function(result){
                return Database.All(result);
            })
    };

    self.isFavouriteTrail = function(trailId){
        return Database.query("SELECT * FROM favourites WHERE trailId = (?)", trailId)
        .then(function(result){
                return result.rows.length > 0;
        });
    };

    self.addFavourite = function(trailId) {
        return Database.query("INSERT INTO favourites (trailId) VALUES (?)", trailId);
    }

    self.removeFavourite = function(trailId){
        return Database.query("DELETE FROM favourites WHERE trailId = (?)", trailId);
    }

    return self;
}]);