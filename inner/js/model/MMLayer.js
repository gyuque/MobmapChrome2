if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MovingObjectLayer() {
		this.primaryView = null;
	}
	
	MovingObjectLayer.prototype = {
		
	};
	
	aGlobal.mobmap.MovingObjectLayer = MovingObjectLayer;
})(window);