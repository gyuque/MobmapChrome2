if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerGenerator() {
		this.previewCanvas = document.createElement('canvas');
		this.resultCanvas = document.createElement('canvas');

		this.previewG = this.previewCanvas.getContext('2d');
		this.resultG = this.resultCanvas.getContext('2d');
	}
	
	MarkerGenerator.prototype = {
		
	};
	
	aGlobal.mobmap.MarkerGenerator = MarkerGenerator;
})(window);