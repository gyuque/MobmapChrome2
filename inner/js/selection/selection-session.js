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