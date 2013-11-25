(function(aGlobal) {
	'use strict';

	var gmap = null;
	var mapContainerElement = null;
	
	function doGLMapTest() {
		
	}
	
	function setupScreen() {
		var box = document.getElementById("map-box");
		mapContainerElement = box;
	}
	
	function setupGoogleMaps(containerElement) {
		
	}

	aGlobal.doGLMapTest = doGLMapTest;
})(window);