if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function GradientEditor(boundGradient) {
		this.boundGradient = boundGradient;
		
		this.previewHeight = 10;
		this.previewWidth = 100;
		this.previewPadding = 4;
		
		this.previewCanvas = document.createElement('canvas');
		this.gradientCanvas = document.createElement('canvas');
		this.gradientCanvasG = this.gradientCanvas.getContext('2d');
		
		this.configureCanvas();
		this.redraw();
	}
	
	GradientEditor.prototype = {
		configureCanvas: function() {
			this.gradientCanvas.width = 1024;
			this.gradientCanvas.height = 4;
			
			this.previewCanvas.width = this.previewWidth + (this.previewPadding << 1);
			this.previewCanvas.height = this.previewHeight + (this.previewPadding << 1);
		},
		
		redraw: function() {
			this.renderPreview();
		},
		
		renderPreview: function() {
			
		}
	};
	
	aGlobal.mobmap.GradientEditor = GradientEditor;
})(window);