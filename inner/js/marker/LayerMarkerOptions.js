if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerMarkerOptions() {
		this.jEventElement = $( createEventDummyElement() );
		this.varyingType = LayerMarkerOptions.MV_NONE;
	}
	
	LayerMarkerOptions.CHANGE_EVENT = "layer-marker-options-event-change";
	
	LayerMarkerOptions.prototype = {
		eventDispatcher: function() {
			return this.jEventElement;
		},
		
		setVaryingType: function(t) {
			if (this.varyingType !== t) {
				this.varyingType = t;
				this.fire();
			}
		},
		
		fire: function() {
			this.eventDispatcher().trigger(LayerMarkerOptions.CHANGE_EVENT, this);
		}
	};
	
	LayerMarkerOptions.MV_NONE = 0;
	LayerMarkerOptions.MV_ATTR = 1;
	LayerMarkerOptions.MV_DAY  = 2;
	
	aGlobal.mobmap.LayerMarkerOptions = LayerMarkerOptions;
})(window);