if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function PolygonOverlay() {
	}

	// Inherit
	PolygonOverlay.prototype = new google.maps.OverlayView();

	PolygonOverlay.prototype.draw = function() {
		
	};

	PolygonOverlay.prototype.onAdd = function() {
		console.log('added')
	};
	
	PolygonOverlay.prototype.onRemove = function() {
		
	};

	aGlobal.mobmap.PolygonOverlay = PolygonOverlay;
})(window);