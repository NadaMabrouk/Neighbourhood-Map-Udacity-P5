var map, bounds;
var infowindow;
var place_id = [];
var markers = [];
var infoWindow;
var win = $(window);

function loadScript() {
    // Loading Google Maps API after the html document is ready
    var script = document.createElement('script');
    script.src = "https://maps.googleapis.com/maps/api/js?key=AIzaSyA4s17-YXp1A1WnXfiKLz34YtfH4R710hc&callback=initMap";
    script.type = "text/javascript";
    document.body.appendChild(script);
}

window.onload = loadScript;
$(document).ready(function(){
	if(win.width() < 767) {
		$('#search-bar').addClass('collapse');
	}
});

$(window).on('resize', function() {
    /*If browser resized, check width again */
    if (win.width() < 767) {
        $('#search-bar').addClass('collapse');
    } else {
        $('#search-bar').removeClass('collapse');
    }
});


function initMap() {
	var searchSpace = {
	            lat: -300,
	            lng: -300
	        };
    //Geolocation Navigator is used to get the user's location 
    if(navigator.geolocation)
    {	
	    navigator.geolocation.getCurrentPosition(function(location) {
	        // Updating the Latitude and Longtiude of the search space to the user's location
	        searchSpace.lat = location.coords.latitude;
	        searchSpace.lng = location.coords.longitude;
	        //Handling of getting the user Location, if it's not updated in the variable properly .. A message displayed to the user that the Application 
	        //can't get his/her position
	        if (searchSpace.lat == -300 && searchSpace.lng == -300) {
	            alert('Application can\'t get your location properly So, we will display to you results around Zurich, Triemli !');
	            searchSpace.lat = '47.3660';
	            searchSpace.lng = '8.4980';
	        } else {
	            //Load Google Maps and create an InfoWindow
	            infoWindow = new google.maps.InfoWindow();
	            map = new google.maps.Map(document.getElementById('map'), {
	                center: searchSpace,
	                zoom: 15
	            });
	            infowindow = new google.maps.InfoWindow();

	            //Using Foursquare API to get all the surrounding restaurants and cafes within radius 1000 and then call our viewModel
	            var url = 'https://api.foursquare.com/v2/venues/search?v=20170614&client_id=1M2HOETDWRORSG2GSH20QPEEF0JT4YCG3C0C1AKYIUO1KNVH&' +
	                'client_secret=J2X14IQDBRAQMS5FVY5KQPNE1XWT2ZL5L0JFE5AFZSMCMNY2&radius=2000&ll=' + searchSpace.lat + ',' +
	                searchSpace.lng + '&query=restaurant|cafe&limit=20';
	            $.getJSON(url)
	                .done(function(data) {
	                    ko.applyBindings(new viewModel(data.response.venues));
	                })
	                .fail(function(status) {
	                    console.log('Foursquare Request Failed ' + status);
	                });
	        }
	    });
	}else {
		document.body.appendChild("<h2> This browser doesn't Support Geolocation");
		searchSpace.lat = '47.3660';
	    searchSpace.lng = '8.4980';
	}
}

function viewModel(initialPlaces) {
    var self = this;
    bounds = new google.maps.LatLngBounds();
    var places;
    var place = function(data) {
        this.name = data.name;
        this.location = {
            lat: data.location.lat,
            lng: data.location.lng
        };
        this.phone = data.contact.formattedPhone;
        this.address = data.location.formattedAddress.join(',');
        this.checkins = data.stats.checkinsCount;
        this.website = data.url;
    };

    this.searchVal = ko.observable('');
    this.places = ko.observableArray([]);

    //Copying data retrieved from the Foursquare API inside an ObservableArray 
    initialPlaces.forEach(function(element) {
        self.places.push(new place(element));
    });

    //Creating markers and setting them on the map 
    places = this.places();
    for (var i = 0; i < places.length; i++) {
        var placeLoc = places[i].location;
        var title = places[i].name;
        var phone = places[i].phone;
        var address = places[i].address;
        var checkins = places[i].checkins;
        var website = places[i].website;
        var marker = new google.maps.Marker({
            map: map,
            position: placeLoc,
            title: title,
            animation: google.maps.Animation.DROP
        });
        bounds.extend(marker.position);
        markers.push(marker);
        this.places()[i].marker = marker;

        var contentString = "<h3>" + title + "</h3><div id='pano'></div><p>" + (phone !== undefined ? phone : '') + "</p><p>" + address +
            "</p><p>Number of People Checkedin: " + checkins + "</p><p>" + (website !== undefined ? 'Website: ' + website : '') + "</p>";
        attachInfoWindow(marker, contentString);
    }

    map.fitBounds(bounds);
    this.showInfo = function(clickedItem) {
        google.maps.event.trigger(clickedItem.marker, 'click');
    };

    //Take the search value from the input field and filter against the array i have
    self.filteredPlaces = ko.computed(function() {
        var filter = self.searchVal().toLowerCase();
        if (!filter) {
            self.places().forEach(function(place) {
                if (place.marker) {
                    place.marker.setVisible(true);
                }
            });
            return self.places();
        } else {
            return ko.utils.arrayFilter(self.places(), function(place) {
                if (place.name.toLowerCase().indexOf(filter) > -1) {
                    place.marker.setVisible(true);
                    return true;
                } else {
                    place.marker.setVisible(false);
                    return false;
                }
            });
        }
    }, self);
}

function attachInfoWindow(marker, contentString) {
    var streetViewService = new google.maps.StreetViewService();
    var radius = 50;

    function getStreetView(data, status) {
        console.log('streetView ' + data.location.latLng);
        if (status == google.maps.StreetViewStatus.OK) {
            var nearStreetViewLocation = data.location.latLng;
            console.log(status);
            var heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);
            var panoramaOptions = {
                position: nearStreetViewLocation,
                pov: {
                    heading: heading,
                    pitch: 30
                }
            };
            var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
        } else {
            infoWindow.setContent(infoWindow.getContent() +
                '<div>No Street View Found</div>');
        }
    }
    marker.addListener('click', function() {
        var self = this;
        streetViewService.getPanoramaByLocation(marker.position, 100, getStreetView);
        if (infoWindow.marker != marker) {
            infoWindow.setContent(contentString);
            infoWindow.open(map, marker);
            // Make sure the marker property is cleared if the infowindow is closed.
            infoWindow.addListener('closeclick', function() {
                infoWindow.marker = null;
            });
        }
        self.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            self.setAnimation(null);
        }, 4000);
    });
}