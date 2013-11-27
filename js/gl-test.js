(function(aGlobal) {
	'use strict';

	var testTextureImage = null;
	var gmap = null;
	var gllayer = null;
	var mapContainerElement = null;
	
	
	function doGLMapTest() {
		testTextureImage = new Image();
		testTextureImage.onload = setupScreen;
		
		testTextureImage.src = TEST_IMAGE;
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
		gllayer.canvasReadyCallback = function() {
			gllayer.setMarkerImage(testTextureImage);
		};
		
		gllayer.setMap(gmap);
	}

	var TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3QsbDSUip/dGjgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAo0lEQVR42u3VIRbCMBBF0Q8HkTrqiIxsHVtgC90Cy2IL3UZlK5GRqaOOuFRiCgc9fddNZsx8MZEA7NnhR6/8OWcygHK59qrqRu/XU/PUmQ3h9G15H25yTspnL6nXPHXFYgjHrceqbuS91Laf2qrNAFIclJI0jtKyJKU47O4IFhceci4o56gc72ZvwO5/AQAAAAAAAAAAAAAAAAAAAAAAAAAwZQW2HiO7UhPQTwAAAABJRU5ErkJggg==";
	aGlobal.doGLMapTest = doGLMapTest;
})(window);