(function(aGlobal) {
	'use strict';

	var gmap = null;
	var gllayer = null;
	var mapContainerElement = null;
	
	function doGLMapTest() {
		setupScreen();
	}
	
	function setupScreen() {
		var box = document.getElementById("map-box");
		mapContainerElement = box;
		
		setupGoogleMaps(box);
	}
	
	function setupGoogleMaps(containerElement) {
		var mapOptions = {
			zoom: 11,
			center: new google.maps.LatLng(35.8, 139.6),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};

		gmap = new google.maps.Map(containerElement, mapOptions);
		
		// ----------------------------------------------
		
		gllayer = new mobmap.GLMobLayer();
		gllayer.setMap(gmap);
	}

	aGlobal.doGLMapTest = doGLMapTest;
})(window);