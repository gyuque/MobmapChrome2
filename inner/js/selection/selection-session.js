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
		
		// - - - - - - - - - -
		
		setStartPos: function(lat, lng) {
			
		},
		
		setEndPos: function(lat, lng) {
			
		}
	};

	aGlobal.mobmap.SelectionSessionType = SelectionSessionType;
	aGlobal.mobmap.RectSelectionSession = RectSelectionSession;
})(window);