if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerGenerator() {
		this.dirty = true;
		this.options = new MarkerGeneratorOptions();
		
		this.jEventElement = $( createEventDummyElement() );
		this.previewCanvas = document.createElement('canvas');
		this.resultCanvas = document.createElement('canvas');
		this.previewCanvas.setAttribute('class', 'mm-marker-preview-canvas');
		this.resultCanvas.setAttribute('class', 'mm-marker-result-canvas');
		this.jResultCanvas = $(this.resultCanvas);

		this.previewNegativeMargin = 4;
		this.previewG = this.previewCanvas.getContext('2d');
		this.resultG = this.resultCanvas.getContext('2d');
		this.lastBaseColorList = null;

		this.textureSourceCanvas = document.createElement('canvas');
		this.textureSourceG = this.textureSourceCanvas.getContext('2d');
		
		this.adjustPreviewMargin();
		this.configureCanvas();
		
		this.testDummyMarkerGenerator();
	}
	
	// Events
	MarkerGenerator.CHANGE_EVENT = "marker-generator-configuration-change";

	// Generate options
	MarkerGenerator.HueGradient   = 0;
	MarkerGenerator.BlendGradient = 1;

	MarkerGenerator.prototype = {
		setParentEventElement: function(pe) {
			replaceParentEventElement( this.eventDispatcher()[0] , pe);
		},

		eventDispatcher: function() {
			return this.jEventElement;
		},
		
		fire: function() {
			this.eventDispatcher().trigger(MarkerGenerator.CHANGE_EVENT, this);
		},
		
		updateTextureCanvas: function() {
			var w = this.calcTextureSize();
			var h = this.resultCanvas.height - 0;
			this.textureSourceCanvas.width = w;
			this.textureSourceCanvas.height = h;

			this.textureSourceG.clearRect(0, 0, w, h);
			this.textureSourceG.drawImage( this.resultCanvas, 0, 0 );

			return this.textureSourceCanvas;
		},
		
		calcTextureSize: function() {
			var op = this.options;
			var w = op.chipWidth * op.nVariations;
			var e = Math.ceil(Math.LOG2E * Math.log(w));
			
			return Math.pow(2, e);
		},
		
		setNumOfVariation: function(n) {
			if (this.options.nVariations !== n) {
				this.dirty = true;
				this.options.nVariations = n;
				
				this.adjustPreviewMargin();
				this.configureCanvas();
				this.testDummyMarkerGenerator();
				
				this.fire();
			}
		},
		
		forceRebuild: function() {
			this.dirty = true;
			this.testDummyMarkerGenerator();
			this.fire();
		},
		
		adjustPreviewMargin: function() {
			var max = this.options.chipWidth - 4;
			var m = Math.floor(this.options.nVariations / 3);
			if (m > max) {m = max;}
			
			this.previewNegativeMargin = m;
		},
		
		configureCanvas: function() {
			var op = this.options;
			var w = op.chipWidth * op.nVariations;
			var h = op.chipHeight * 2;
			
			this.previewCanvas.width = this.calcPreviewWidth();
			this.previewCanvas.height = h >> 1;

			this.resultCanvas.width = w;
			this.resultCanvas.height = h;
		},
		
		calcPreviewWidth: function() {
			var op = this.options;
			var w = op.chipWidth * op.nVariations;
			var neg = (op.nVariations - 1) * this.previewNegativeMargin;
			
			return w - neg;
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
			var baseColors = MarkerGenerator.generateMarkerBaseColors(op);
			MarkerGenerator.renderMarkerSequenceWithCompositeType(op.compositionType, this.resultG, op.nVariations, op.chipWidth, op.chipHeight, baseColors);
			
			MarkerGenerator.renderPreviewImage(
				this.previewG,
				this.previewCanvas.width - 0,
				this.previewCanvas.height - 0,
				this.resultCanvas,
				op.chipWidth,
				this.previewNegativeMargin
			);

			this.lastBaseColorList = baseColors;
		}
	};
	
	MarkerGenerator.generateMarkerBaseColors = function(markerOptions, nVariations) {
		var n = markerOptions.nVariations || nVariations;
		
		if (markerOptions.gradientType === MarkerGenerator.HueGradient)
			return MarkerGenerator.generateRainbowColors(n, 220, markerOptions.reverseOrder);
		else
			return MarkerGenerator.generateBlendGradient(n, markerOptions.color1, markerOptions.color2);
	};

	var kRGBWhiteColor = new RGBColor(255, 255, 255);
	var kRGBRedColor = new RGBColor(255, 0, 0);

	MarkerGenerator.generateBlendGradient = function(n, c1, c2) {
		c1 = c1 || kRGBWhiteColor;
		c2 = c2 || kRGBRedColor;
		
		var RGBlist = [];
		for (var i = 0;i < n;++i) {
			var newColor = new RGBColor(0, 0, 0);
			blendRGBColors(newColor, c1, c2, i / (n-1));
			RGBlist.push(newColor);
		}
		
		return RGBlist;
	};
	
	MarkerGenerator.generateRainbowColors = function(n, hueMax, reverseOrder) {
		var RGBlist = [];
		var tmpC = [0,0,0];
		
		for (var i = 0;i < n;++i) {
			var index = reverseOrder ? ((n-1) - i) : i;
			var t = index / (n - 0.99);
			var hue = Math.floor(hueMax * (1-t));
			tmpC[0] = hue;
			tmpC[1] = 0.9;
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

	var _spottmpRGB = new RGBColor(0, 0, 0);
	MarkerGenerator.renderSpotMarker = function(g, baseColor, blendColor) {
		var clr = baseColor.toHTMLRGB();
		var alpha = 1;
		if (blendColor) {
			var blendRGB = parseHTMLRGBHex3(blendColor);
			_spottmpRGB.r = ( blendRGB       & 0xf) * 17;
			_spottmpRGB.g = ((blendRGB >> 4) & 0xf) * 17;
			_spottmpRGB.b = ((blendRGB >> 8) & 0xf) * 17;
			
			blendRGBColors(_spottmpRGB, baseColor, _spottmpRGB, 0.9);
			clr = _spottmpRGB.toHTMLRGB();
			alpha = 0.4;
		};
		
		g.save();
		g.globalAlpha = alpha;
		g.shadowColor = clr;
		g.shadowBlur = 3;
		g.fillStyle = clr;
		g.fillRect(3, 3, 1, 1);

		g.globalAlpha = alpha * 0.3;
		g.fillRect(2, 3, 3, 1);
		g.fillRect(3, 2, 1, 3);
		
		g.restore();
	};

	MarkerGenerator.renderDotMarkerSequence = function(g, n, xStep, yStep, baseColorList) {
		MarkerGenerator.renderMarkerSequence(g, n, xStep, yStep, baseColorList,
			MarkerGenerator.renderDotMarker);
	};

	MarkerGenerator.renderSpotMarkerSequence = function(g, n, xStep, yStep, baseColorList) {
		MarkerGenerator.renderMarkerSequence(g, n, xStep, yStep, baseColorList,
			MarkerGenerator.renderSpotMarker);
	};


	MarkerGenerator.renderMarkerSequenceWithCompositeType = function(compositionType, g, n, xStep, yStep, baseColorList) {
		if (compositionType === kMarkerCompositionNormal)
			MarkerGenerator.renderDotMarkerSequence(g, n, xStep, yStep, baseColorList);
		else
			MarkerGenerator.renderSpotMarkerSequence(g, n, xStep, yStep, baseColorList);
	};

	MarkerGenerator.renderMarkerSequence = function(g, n, xStep, yStep, baseColorList, generatorFunc) {
		var ox = 4;
		var oy = 4;

		var x = 0;
		for (var i = 0;i < n;++i) {
			g.save();
			g.translate(ox + x, oy);
			generatorFunc(g, baseColorList[i]);
			g.restore();

			g.save();
			g.translate(ox + x, oy + yStep);
			generatorFunc(g, baseColorList[i], '#666');
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

	MarkerGenerator.renderPreviewImage = function(destG, destW, destH, sourceCanvas, chipWidth, negativeMargin) {
		// Generate fade image
		var g = destG;
		var x;
		var dx;
		var a = 1;
		var h = destH;
		var srcW = sourceCanvas.width - 0;
		for (x = dx = 0;x < srcW;++x) {
			if (x && (x % chipWidth) === 0) {
				dx -= negativeMargin;
			}
			
			/*
			a = 2.2 - x / (srcW / 2);
			if (a > 1) {a = 1;}
			*/
			
			g.save();
			g.globalAlpha = a;
			g.drawImage(sourceCanvas, x, 0, 1, h,
			                          dx, 0, 1, h);
			g.restore();
			
			++dx;
		}
	}

	// --------------
	function MarkerGeneratorOptions() {
		this.jEventElement = $(document.createElement('span'));
		this.reset();
	}
	
	MarkerGeneratorOptions.prototype.reset = function() {
		this.chipWidth = 16;
		this.chipHeight = 16;
		this.nVariations = 8;
		this.gradientType = MarkerGenerator.HueGradient;
		this.reverseOrder = false;
		this.color1 = null;
		this.color2 = null;
		this.compositionType = kMarkerCompositionNormal;
	}
	
	aGlobal.mobmap.MarkerGenerator = MarkerGenerator;
	aGlobal.mobmap.MarkerGeneratorOptions = MarkerGeneratorOptions;
})(window);