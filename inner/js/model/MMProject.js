if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function MMProject() {
		this.layerList = new LayerList();
		this.jElement = $(document.createElement('span'));
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
		}
	};
	
	// ---------------------------
	function LayerList() {
		// From bottom to top
		this.array = [];
	}
	
	LayerList.prototype = {
		appendOnTop: function(newLayer) {
			if (this.alreadyExists(newLayer)) {
				return;
			}

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