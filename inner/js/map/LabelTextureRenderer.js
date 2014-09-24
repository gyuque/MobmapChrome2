if (!window.mobmap) { window.mobmap={}; }

(function(pkg) {
	function LabelTextureRenderer(gl) {
		this.texture = null;
		this.canvas = null;
		this.g = null;
		
		this.labelBoxHeight = 16;
		this.gl = gl;
		this.textureSize = 256;
		this.initCanvas();
		this.initTextureObject();
	}
	
	LabelTextureRenderer.prototype = {
		calcLabelCapacity: function() {
			return Math.floor(this.textureSize / this.labelBoxHeight);
		},
		
		renewWithTextList: function(textlist) {
			this.clear();
			var n = this.calcLabelCapacity();
			var y = 0;
			for (var i = 0;i < n;++i) {
				if (textlist.length < 1) { break;}
				var tx = textlist.shift();
				this.drawLabel(tx, y);
				
				y += this.labelBoxHeight;
			}
			
			this.updateTexture();
			return i;
		},
		
		calcVCoordStride: function() {
			return this.labelBoxHeight / this.textureSize;
		},
		
		getLabelSpriteWidth: function() {
			return this.textureSize;
		},

		getLabelSpriteHeight: function() {
			return this.labelBoxHeight;
		},



		initCanvas: function() {
			this.canvas = document.createElement('canvas');
			this.configureCanvasSize(this.textureSize, this.textureSize);
			
			this.g = this.canvas.getContext('2d');
			this.g.font = "normal 600 11px sans-serif";
		},
		
		configureCanvasSize: function(w, h) {
			this.canvas.width = w;
			this.canvas.height = h;
		},
		
		initTextureObject: function() {
			this.texture = this.gl.createTexture();
		},
		
		updateTexture: function() {
			var tex = this.texture;
			if (!tex) {
				return false;
			}
			
			var gl = this.gl;
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas);
			gl.generateMipmap(gl.TEXTURE_2D);
			return true;
		},
		
		drawLabel: function(text, yBase) {
			var g = this.g;
			g.save();
			g.fillStyle = '#000';
			g.fillText(text, 2, yBase+ 11);
			g.fillText(text, 2, yBase+ 13);
			g.fillText(text, 1, yBase+ 12);
			g.fillText(text, 3, yBase+ 12);
			
			g.fillStyle = '#5f9';
			g.fillText(text, 2, yBase+ 12);
			g.restore();
			
			/*
			var metrics = g.measureText(text);
			if (metrics.width > (this.textureSize - 8)) {
				this.applyFade();
			}
			*/
 		},
/*
		applyFade: function() {
			var targetHeight = 24;
			var fadeWidth = 24;
			var ox = this.textureSize - fadeWidth;

			var g = this.g;
			g.getImageData(ox, 0, fadeWidth, targetHeight);
		},
*/
		clear: function() {
			this.g.clearRect(0, 0, this.textureSize, this.textureSize);
		}
	};
	
	pkg.LabelTextureRenderer = LabelTextureRenderer;
})(window.mobmap);