if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var SelectionSessionType = {
		Unknown: 0,
		Rect: 1,
		LineGate: 11
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
				selp.clear(true);

				if (lyr.capabilities & mobmap.LayerCapability.SpatialSelectable) {
					var pool = lyr.movingData.createPickPool();
					pool.clear();

					lyr.movingData.pickAt(pool, pickTime);
					this.filterRect(pool, selp);
				}
				
				selp.fire();
			}
		},
		
		filterRect: function(sourcePickPool, targetSelPool) {
			var xmin = Math.min(this.startPos.lng, this.endPos.lng);
			var xmax = Math.max(this.startPos.lng, this.endPos.lng);
			var ymin = Math.min(this.startPos.lat, this.endPos.lat);
			var ymax = Math.max(this.startPos.lat, this.endPos.lat);
			
			var sourceCount = sourcePickPool.pickedCount;
			var src_array = sourcePickPool.getArray();
			for (var i = 0;i < sourceCount;++i) {
				var sourceRecord = src_array[i];
				var objId = sourceRecord._id;
				
				var ox = sourceRecord.x;
				var oy = sourceRecord.y;
				if (ox >= xmin && oy >= ymin && ox <= xmax && oy <= ymax) {
					targetSelPool.addId(objId, true);
				}
			}
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


	// ------------------------------------
	function LineGateSession()  {
		
	}
	
	LineGateSession.prototype = {
		// Common API
		getType: function() {
			return SelectionSessionType.LineGate;
		},
		
		isDraggingSelectionRecommended: function() {
			return true;
		},
		
		isRectangleFeedbackRecommended: function() {
			return false;
		},
		
		makeIDCollection: function(targetProject) {
			
		}
	};
	

	aGlobal.mobmap.SelectionSessionType = SelectionSessionType;
	aGlobal.mobmap.RectSelectionSession = RectSelectionSession;
	aGlobal.mobmap.LineGateSession = LineGateSession;
})(window);