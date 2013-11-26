(function(aGlobal) {
	'use strict';

	var testTextureImage = null;
	var gmap = null;
	var gllayer = null;
	var mapContainerElement = null;
	
	
	function doGLMapTest() {
		testTextureImage = new Image();
		testTextureImage.onload = setupScreen;
		
		testTextureImage.src = "images/test-marker.png";
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
		gllayer.setMarkerImage(testTextureImage);
	}

	aGlobal.doGLMapTest = doGLMapTest;
})(window);