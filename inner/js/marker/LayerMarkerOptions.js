if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerMarkerOptions() {
		this.jEventElement = $( createEventDummyElement() );
		this.varyingType = LayerMarkerOptions.MV_NONE;
		this.tailType = LayerMarkerOptions.TAIL_NONE;
		this.tailInterval = 40;
		this.tailSegments = 6;
		this.tailFade = false;
		this.showSelectedOnly = false;
		this.boundAttributeName = null;
	}
	
	LayerMarkerOptions.CHANGE_EVENT = "layer-marker-options-event-change";
	
	LayerMarkerOptions.prototype = {
		setParentEventElement: function(pe) {
			replaceParentEventElement(this.jEventElement[0], pe);
		},
		
		eventDispatcher: function() {
			return this.jEventElement;
		},
		
		setVaryingType: function(t) {
			if (this.varyingType !== t) {
				this.varyingType = t;
				this.fire();
			}
		},
		
		setTailType: function(t) {
			if (this.tailType !== t) {
				this.tailType = t;
				this.fire();
			}
		},

		setTailFade: function(f) {
			if (this.tailFade !== f) {
				this.tailFade = f;
				this.fire();
			}
		},
		
		bindAttributeName: function(a_name) {
			if (this.boundAttributeName !== a_name) {
				this.boundAttributeName = a_name;
				this.fire();
			}
		},
		
		setShowSelectedOnly: function(newVal) {
			if (this.showSelectedOnly === newVal) { return; }
			this.showSelectedOnly = newVal;
			this.fire();
		},
		
		fire: function() {
			this.eventDispatcher().trigger(LayerMarkerOptions.CHANGE_EVENT, this);
		}
	};
	
	LayerMarkerOptions.MV_NONE = 0;
	LayerMarkerOptions.MV_ATTR = 1;
	LayerMarkerOptions.MV_DAY  = 2;

	LayerMarkerOptions.TAIL_NONE        = 0;
	LayerMarkerOptions.TAIL_WITH_MARKER = 1;
	LayerMarkerOptions.TAIL_ONLY        = 2;
	
	aGlobal.mobmap.LayerMarkerOptions = LayerMarkerOptions;
})(window);