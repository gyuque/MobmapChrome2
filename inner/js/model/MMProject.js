if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function MMProject() {
		this.jElement = $(document.createElement('span'));
		this.layerList = new LayerList(this.jElement[0]);
		this.currentDateTime = new mobmap.DateTime();
	}
	
	MMProject.LAYERLIST_CHANGE = "mmprj-event-layerlist-change";
	
	MMProject.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},

		addMovingObjectLayer: function() {
			var lyr = new mobmap.MovingObjectLayer();
			this.layerList.appendOnTop(lyr);
			
			this.triggerEvent(MMProject.LAYERLIST_CHANGE);
			return lyr;
		},
		
		triggerEvent: function(eventType) {
			this.eventDispatcher().trigger(eventType, this);
		},
		
		getAllLayersTimeRange: function() {
			var start_t = Number.MAX_VALUE;
			var end_t   = -1;
			
			var len = this.layerList.getCount();
			for (var i = 0;i < len;++i) {
				var lyr = this.layerList.getLayerAt(i);
				if (lyr.dataTimeRange.start < start_t) { start_t = lyr.dataTimeRange.start; }
				if (lyr.dataTimeRange.end > end_t) { end_t = lyr.dataTimeRange.end; }
			}
			
			return {
				start: start_t,
				end: end_t
			};
		}
	};
	
	// ---------------------------
	function LayerList(parentEventElement) {
		// From bottom to top
		this.array = [];
		this.parentEventElement = parentEventElement;
	}
	
	LayerList.prototype = {
		getCount: function() {
			return this.array.length;
		},
		
		getLayerAt: function(i) {
			return this.array[i] || null;
		},
		
		appendOnTop: function(newLayer) {
			if (this.alreadyExists(newLayer)) {
				return;
			}

			newLayer.setOwnerList(this);
			newLayer.setParentEventElement(this.parentEventElement);
			this.array.push(newLayer);
		},
		
		alreadyExists: function(lyr) {
			for (var i = 0;i < this.array.length;++i) {
				if (this.array[i] === lyr) {
					return true;
				}
			}
			
			return false;
		}
	};
	// ----------------------------
	
	// +++ Export +++
	aGlobal.mobmap.MMProject = MMProject;
})(window);