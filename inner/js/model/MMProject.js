if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function MMProject() {
		this.jElement = $(document.createElement('span'));
		this.layerList = new LayerList(this.jElement[0]);
		this.currentDateTime = new mobmap.DateTime();
		this.timeRangeSelection = new mobmap.TimeRangeSelection();
	}
	
	MMProject.LAYERLIST_CHANGE = "mmprj-event-layerlist-change";
	
	MMProject.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		getLayerList: function() {
			return this.layerList;
		},
		
		getCurrentTimeInSeconds: function() {
			var d = this.currentDateTime;
			return d.getCurrentTime();
		},

		addMovingObjectLayer: function(additionalCapFlag) {
			var lyr = new mobmap.MovingObjectLayer();
			if (additionalCapFlag) {
				lyr.capabilities |= additionalCapFlag;
			}
			
			this.appendLayerAndNotify(lyr);
			return lyr;
		},
		
		addMeshLayer: function() {
			var lyr = new mobmap.MMMeshLayer();
			this.appendLayerAndNotify(lyr);
			return lyr;
		},
		
		appendLayerAndNotify: function(lyr) {
			this.layerList.appendOnTop(lyr);
			this.triggerEvent(MMProject.LAYERLIST_CHANGE);
			return lyr;
		},
		
		removeLayerAndNotify: function(lyr) {
			if (this.layerList.removeLayer(lyr)) {
				lyr.destroy();
				this.triggerEvent(MMProject.LAYERLIST_CHANGE);
			}
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

				if (lyr.hasTimeRange()) {
					if (lyr.dataTimeRange.start < start_t) { start_t = lyr.dataTimeRange.start; }
					if (lyr.dataTimeRange.end > end_t) { end_t = lyr.dataTimeRange.end; }
				}
			}

			return {
				start: start_t,
				end: end_t
			};
		},
		
		forEachLayer: function(proc) {
			var len = this.layerList.getCount();
			for (var i = 0;i < len;++i) {
				proc(i, this.layerList.getLayerAt(i) );
			}
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
			
			console.log("Number of layers: ", this.array.length);
		},
		
		alreadyExists: function(lyr) {
			for (var i = 0;i < this.array.length;++i) {
				if (this.array[i] === lyr) {
					return true;
				}
			}
			
			return false;
		},
		
		removeLayer: function(targetLayer) {
			var i = this.array.indexOf(targetLayer);
			if (i < 0) {return false;}
			
			this.array.splice(i, 1);
			
			return true;
		}
	};
	// ----------------------------
	
	// +++ Export +++
	aGlobal.mobmap.MMProject = MMProject;
})(window);