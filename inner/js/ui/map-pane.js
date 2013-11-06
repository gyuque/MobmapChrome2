if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var DARKMAP_ID = 'dark';
	
	function MapPane(containerElement) {
		this.gmap = null;
		this.initialLocation = {
			zoom: 8,
			lat: 36.7,
			lng: 138.7
		};
		// ----------------------------------------------------------
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		
		this.setupGoogleMaps();
	}
	
	MapPane.prototype = {
		setupGoogleMaps: function(overrideInitialCenter) {
			if (overrideInitialCenter) {
				this.initialLocation.lat = overrideInitialCenter.lat;
				this.initialLocation.lng = overrideInitialCenter.lng;
			}
			
			var mapOptions = {
				zoom: this.initialLocation.zoom,
				center: new google.maps.LatLng(this.initialLocation.lat, this.initialLocation.lng),

				mapTypeId: google.maps.MapTypeId.ROADMAP,
				mapTypeControlOptions: {
					mapTypeIds: this.generateDefaultMapTypeList()
				}
			};

			this.gmap = new google.maps.Map(this.containerElement, mapOptions);
		},
		
		generateDefaultMapTypeList: function() {
			return [
				google.maps.MapTypeId.HYBRID,
				google.maps.MapTypeId.ROADMAP,
				google.maps.MapTypeId.SATELLITE,
				google.maps.MapTypeId.TERRAIN,
				DARKMAP_ID
			];
		}
	};

	// +++ Export +++
	aGlobal.mobmap.MapPane = MapPane;
})(window);