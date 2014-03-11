if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function GradientEditor() {
		this.previewHeight = 10;
		this.previewWidth = 100;
		this.previewPadding = 4;
		this.previewCanvas = document.createElement('canvas');
	}
	
	GradientEditor.prototype = {
	};
	
	aGlobal.mobmap.GradientEditor = GradientEditor;
})(window);