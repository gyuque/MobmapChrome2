if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var SelectionSessionType = {
		Unknown: 0,
		Rect: 1
	};
	
	var SelectionSessionBase = {
		
	};


	function RectSelectionSession() {
		this.startPos = new mobmap.MMLatLng();
		this.endPos = new mobmap.MMLatLng();
	}
	
	RectSelectionSession.prototype = {
		// Common API
		getType: function() {
			return SelectionSessionType.Rect;
		},
		
		isDraggingSelectionRecommended: function() {
			return true;
		},
		
		isRectangleFeedbackRecommended: function() {
			return true;
		},

		makeIDCollection: function(targetProject) {
			var pickTime = targetProject.getCurrentTimeInSeconds();

			var ls = targetProject.getLayerList();
			var len = ls.getCount();
			
			for (var i = 0;i < len;++i) {
				var lyr = ls.getLayerAt(i);
				var selp = lyr.localSelectionPool;
				selp.clear();

				if (lyr.capabilities & mobmap.LayerCapability.SpatialSelectable) {
					var pool = lyr.movingData.createPickPool();
					pool.clear();

					lyr.movingData.pickAt(pool, pickTime);
					this.filterRect(pool, selp);
//					var allCount = pool.pickedCount;
//					console.log("layer selection", allCount);
				}
			}
		},
		
		filterRect: function(sourcePickPool, targetSelPool) {
			var xmin = Math.min(this.startPos.lng, this.endPos.lng);
			var xmax = Math.max(this.startPos.lng, this.endPos.lng);
			var ymin = Math.min(this.startPos.lat, this.endPos.lat);
			var ymax = Math.max(this.startPos.lat, this.endPos.lat);
		},

		// - - - - - - - - - -
		
		setStartPos: function(lat, lng) {
			this.startPos.lat = lat;
			this.startPos.lng = lng;
		},
		
		setEndPos: function(lat, lng) {
			this.endPos.lat = lat;
			this.endPos.lng = lng;
		},
		
		getStartPos: function() {
			return this.startPos;
		},
		
		getEndPos: function() {
			return this.endPos;
		}
	};

	aGlobal.mobmap.SelectionSessionType = SelectionSessionType;
	aGlobal.mobmap.RectSelectionSession = RectSelectionSession;
})(window);