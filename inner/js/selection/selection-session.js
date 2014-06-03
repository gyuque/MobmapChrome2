if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var SelectionSessionType = {
		Unknown: 0,
		Rect: 1,
		PolygonPick: 5,
		LineGate: 11
	};
	
	var SelectionSessionBase = {
		installSinglePointSessionAPI: function(proto) {
			proto.setPosition = function(lat, lng) {
				this.pos.lat = lat;
				this.pos.lng = lng;
			};

			proto.getPosition = function() { return this.pos; };
		},
		
		installTwoPointsSessionAPI: function(proto) {
			proto.setStartPos = function(lat, lng) {
				this.startPos.lat = lat;
				this.startPos.lng = lng;
			};
			
			proto.setEndPos = function(lat, lng) {
				this.endPos.lat = lat;
				this.endPos.lng = lng;
			};

			proto.getStartPos = function() { return this.startPos; };
			proto.getEndPos = function() { return this.endPos; };
		}
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

		isLineFeedbackRecommended: function() {
			return false;
		},

		makeIDCollection: function(targetProject) {
			var pickTime = targetProject.getCurrentTimeInSeconds();

			var ls = targetProject.getLayerList();
			var len = ls.getCount();
			
			for (var i = 0;i < len;++i) {
				var lyr = ls.getLayerAt(i);
				if ((lyr.capabilities & mobmap.LayerCapability.SpatialSelectable) === 0) {
					continue;
				}
				
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
		}
	};

	SelectionSessionBase.
	 installTwoPointsSessionAPI(RectSelectionSession.prototype);

	// ------------------------------------
	function PolygonPickSelectionSession() {
		this.pos = new mobmap.MMLatLng();
	}

	PolygonPickSelectionSession.prototype = {
		getType: function() {
			return SelectionSessionType.PolygonPick;
		},
	
		isDraggingSelectionRecommended: function() {
			return false;
		},
	
		isRectangleFeedbackRecommended: function() {
			return false;
		},

		isLineFeedbackRecommended: function() {
			return false;
		}
	}
	
	SelectionSessionBase.
	 installSinglePointSessionAPI(PolygonPickSelectionSession.prototype);

	// ------------------------------------
	function LineGateSession()  {
		this.startPos = new mobmap.MMLatLng();
		this.endPos = new mobmap.MMLatLng();
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

		isLineFeedbackRecommended: function() {
			return true;
		},
		
		makeIDCollection: function(targetProject) {
			// Do nothing here.
			// Actual selection will be done later.
		},
		
		doAfterCommit: function(app) {
			app.getMapPane().putGate(
				this.getStartPos(),
				this.getEndPos()
			);
		}
	};

	SelectionSessionBase.
	 installTwoPointsSessionAPI(LineGateSession.prototype);

	aGlobal.mobmap.SelectionSessionType = SelectionSessionType;
	aGlobal.mobmap.RectSelectionSession = RectSelectionSession;
	aGlobal.mobmap.PolygonPickSelectionSession = PolygonPickSelectionSession;
	aGlobal.mobmap.LineGateSession = LineGateSession;
})(window);