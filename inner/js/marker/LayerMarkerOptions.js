if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerMarkerOptions() {
		this.jEventElement = $( createEventDummyElement() );
		this.varyingType = LayerMarkerOptions.MV_NONE;
	}
	
	LayerMarkerOptions.prototype = {
		eventDispatcher: function() {
			return this.jEventElement;
		}
	};
	
	LayerMarkerOptions.MV_NONE = 0;
	LayerMarkerOptions.MV_ATTR = 1;
	LayerMarkerOptions.MV_DAY  = 2;
	
	aGlobal.mobmap.LayerMarkerOptions = LayerMarkerOptions;
})(window);