if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var kGradientCanvasWidth = 1024;
	
	function GradientEditor(boundGradient) {
		this.element = document.createElement('div');
		this.boundGradient = boundGradient;
		
		this.previewHeight = 10;
		this.previewWidth = 100;
		this.previewPadding = 4;
		
		this.previewCanvas = document.createElement('canvas');
		this.previewCanvasG = this.previewCanvas.getContext('2d');

		this.smallPreviewCanvas = document.createElement('canvas');
		this.smallPreviewCanvasG = this.smallPreviewCanvas.getContext('2d');

		this.gradientCanvas = document.createElement('canvas');
		this.gradientCanvasG = this.gradientCanvas.getContext('2d');
		
		this.previewCanvas.setAttribute('class', 'mm-gradient-editor-preview');
		this.configureCanvas();
		this.redraw();
	}
	
	GradientEditor.prototype = {
		getPreviewElement: function() {
			return this.smallPreviewCanvas;
		},
		
		configureCanvas: function() {
			this.gradientCanvas.width = kGradientCanvasWidth;
			this.gradientCanvas.height = 4;
			
			this.previewCanvas.width = this.previewWidth + (this.previewPadding << 1);
			this.previewCanvas.height = this.previewHeight + (this.previewPadding << 1);

			this.smallPreviewCanvas.width = this.previewWidth + 2;
			this.smallPreviewCanvas.height = this.previewHeight + 2;
		},
		
		redraw: function() {
			this.updateGradientCanvas();
			this.renderPreview();
			this.renderSmallPreview();
		},

		renderSmallPreview: function() {
			var w = this.previewWidth;
			var h = this.previewHeight;
			var g = this.smallPreviewCanvasG;
			g.clearRect(0, 0, w+2, h+2);
			g.fillStyle = 'rgba(0,0,0,0.5)';
			g.fillRect(0, 0, w+2, h+2);
			g.fillStyle = 'rgba(255,255,255,0.5)';
			g.fillRect(1, 1, w, h);

			g.drawImage(this.gradientCanvas, 0, 0, this.gradientCanvas.width - 0, 4,
				        1, 1, w, h);	
		},
		
		renderPreview: function() {
			/*
			var w = this.previewWidth;
			var h = this.previewHeight;
			
			var g = this.previewCanvasG;
			this.clearPreview();
			g.fillStyle = 'rgba(0,0,0,0.5)';
			g.fillRect(this.previewPadding-1, this.previewPadding-1, w+2, h+2);
			
			g.drawImage(this.gradientCanvas, 0, 0, this.gradientCanvas.width - 0, 4,
				        this.previewPadding, this.previewPadding, w, h);	
			*/
		},
		
		clearPreview: function() {
			var w = this.previewCanvas.width - 0;
			var h = this.previewCanvas.height - 0;
			this.previewCanvasG.clearRect(0, 0, w, h);
		},
		
		updateGradientCanvas: function() {
			var g = this.gradientCanvasG;
			var gr = g.createLinearGradient(0, 0, kGradientCanvasWidth, 0);
			this.registerGradientStops(gr, this.boundGradient);
			
			g.fillStyle = gr;
			g.fillRect(0, 0, kGradientCanvasWidth, 4);
		},
		
		registerGradientStops: function(gr, source) {
			var len = source.countStops();
			for (var i = 0;i < len;++i) {
				var stopColor = source.getStopAsHTMLColor(i);
				gr.addColorStop( source.getStopPosition(i) , stopColor);
			}
		}
	};
	
	aGlobal.mobmap.GradientEditor = GradientEditor;
})(window);