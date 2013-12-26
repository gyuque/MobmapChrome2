if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerGenerator() {
		this.options = new MarkerGeneratorOptions();
		
		this.previewCanvas = document.createElement('canvas');
		this.resultCanvas = document.createElement('canvas');
		this.previewCanvas.setAttribute('class', 'mm-marker-preview-canvas');

		this.previewG = this.previewCanvas.getContext('2d');
		this.resultG = this.resultCanvas.getContext('2d');
		
		this.configureCanvas();
		
		this.testDummyMarkerGenerator();
	}
	
	MarkerGenerator.prototype = {
		configureCanvas: function() {
			var op = this.options;
			var w = op.chipWidth * op.nVariations;
			var h = op.chipHeight * 2;
			
			this.previewCanvas.width = w;
			this.previewCanvas.height = h;

			this.resultCanvas.width = w;
			this.resultCanvas.height = h;
		},
		
		clearCanvas: function() {
			var w = this.resultCanvas.width - 0;
			var h = this.resultCanvas.height - 0;
			
			this.previewG.clearRect(0, 0, w, h);
			this.resultG.clearRect(0, 0, w, h);
		},
		
		testDummyMarkerGenerator: function() {
			this.clearCanvas();
			
			var op = this.options;
			var baseColors = MarkerGenerator.generateRainbowColors(op.nVariations, 220);
			
			MarkerGenerator.renderDotMarkerSequence(this.resultG, op.nVariations, op.chipWidth, op.chipHeight, baseColors);
		}
	};
	
	MarkerGenerator.generateRainbowColors = function(n, hueMax) {
		var RGBlist = [];
		var tmpC = [0,0,0];
		
		for (var i = 0;i < n;++i) {
			var t = i / (n - 0.99);
			var hue = Math.floor(hueMax * (1-t));
			tmpC[0] = hue;
			tmpC[1] = 1;
			tmpC[2] = 0.8;

			hsvToRGB(tmpC);
			var rgb = new RGBColor(tmpC[0], tmpC[1], tmpC[2]);
			RGBlist.push(rgb);
		}
		
		return RGBlist;
	};
	
	MarkerGenerator.renderDotMarker = function(g, baseColor, blendColor) {
		g.beginPath();
		g.moveTo(0, 0);
		g.lineTo(7, 0);
		g.lineTo(7, 7);
		g.lineTo(0, 7);
		g.clip();
		
		g.fillStyle = '#000';
		g.fillRect(-1, -1, 9, 9);

		// Inner fill
		g.fillStyle = MarkerGenerator.createBallGradient(g, baseColor.r, baseColor.g, baseColor.b, 1);
		g.beginPath();
		g.arc(3.5, 3.5, 3, 0, Math.PI*2);
		g.fill();
		
		if (blendColor) {
			g.save();
			g.fillStyle = blendColor;
			g.globalAlpha = 0.9;
			g.fillRect(-1, -1, 9, 9);
			g.restore();
		}

		// Remove outer area
		g.clearRect(0, 0, 2, 1);
		g.clearRect(0, 1, 1, 1);

		g.clearRect(0, 6, 2, 1);
		g.clearRect(0, 5, 1, 1);

		g.clearRect(5, 0, 2, 1);
		g.clearRect(6, 1, 1, 1);

		g.clearRect(5, 6, 2, 1);
		g.clearRect(6, 5, 1, 1);
	};

	MarkerGenerator.renderDotMarkerSequence = function(g, n, xStep, yStep, baseColorList) {
		var ox = 4;
		var oy = 4;

		var x = 0;
		for (var i = 0;i < n;++i) {
			g.save();
			g.translate(ox + x, oy);
			MarkerGenerator.renderDotMarker(g, baseColorList[i]);
			g.restore();

			g.save();
			g.translate(ox + x, oy + yStep);
			MarkerGenerator.renderDotMarker(g, baseColorList[i], '#666');
			g.restore();

			x += xStep;
		}
	};
	
	MarkerGenerator.createBallGradient = function(g, cR, cG, cB, hdiv) {
		hdiv = (hdiv < 2) ? 1 : hdiv;
		var gr = g.createRadialGradient(3.3, 2.5, 1, 3.5, 3, 4);
		gr.addColorStop(0  , this.toRGB(cR, cG, cB, 130 / hdiv));
		gr.addColorStop(0.3, this.toRGB(cR, cG, cB, 50 / hdiv));
		gr.addColorStop(1  , this.toRGB(cR, cG, cB));
		
		return gr;
	};
	
	MarkerGenerator.toRGB = function(cR, cG, cB, additional) {
		additional = additional || 0;
		cR = Math.min(255, cR + additional);
		cG = Math.min(255, cG + additional);
		cB = Math.min(255, cB + additional);
		
		return "rgb(" +cR+ "," +cG+ "," +cB+ ")";
	};

	// --------------
	function MarkerGeneratorOptions() {
		this.jEventElement = $(document.createElement('span'));
		this.reset();
	}
	
	MarkerGeneratorOptions.prototype.reset = function() {
		this.chipWidth = 16;
		this.chipHeight = 16;
		this.nVariations = 4;
	}
	
	aGlobal.mobmap.MarkerGenerator = MarkerGenerator;
	aGlobal.mobmap.MarkerGeneratorOptions = MarkerGeneratorOptions;
})(window);