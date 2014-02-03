if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MMLatLng(_lat, _lng) {
		this.lat = _lat || 0;
		this.lng = _lng || 0;
	}

	aGlobal.mobmap.MMLatLng = MMLatLng;
})(window);