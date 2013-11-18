if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MovingObjectLayer() {
		this.primaryView = null;
	}
	
	MovingObjectLayer.prototype = {
		hasPrimaryView: function() {
			return !!this.primaryView;
		}
	};
	
	aGlobal.mobmap.MovingObjectLayer = MovingObjectLayer;
})(window);