if (!window.mobmap) { window.mobmap={}; }

(function(aPkg) {
	'use strict';

	function GLPostProcessor(gl) {
		this.gl = gl;
		this.texOffscreen = null;
		this.fbo = null;
		this.currentTextureSize = 0;

		this.vertexBuffers = {
			uv: null,
			pos: null
		};
		
		this.vbSourceArrays = {
			uv: null,
			pos: null
		};

		this.bEnabled = false;
	}
	
	GLPostProcessor.prototype = {
		generateOrExpandOffscreen: function(reqWidth, reqHeight) {
			var bigger = Math.max(reqWidth, reqHeight);
			var requiredSize = calcMin2x(bigger);
			
			if (this.currentTextureSize >= requiredSize) {
				return;
			}
			
			if (this.texOffscreen) {
				this.releaseOffscreen();
			}
			
			this.texOffscreen = this.createTexture(requiredSize);
			this.fbo = this.createFramebuffer(this.texOffscreen);
			this.currentTextureSize = requiredSize;
		},
		
		createTexture: function(size) {
			var gl = this.gl;
			var tex = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

			gl.texImage2D(
			  gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0,
			  gl.RGBA, gl.UNSIGNED_BYTE, null);
			
			gl.bindTexture(gl.TEXTURE_2D, null);
			return tex;
		},
		
		createFramebuffer: function(boundTexture) {
			var gl = this.gl;
			var fbo = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, boundTexture, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			
			return fbo;
		},
		
		releaseOffscreen: function() {
			var gl = this.gl;
			
			if (this.fbo) {
				gl.deleteFramebuffer(this.fbo);
				this.fbo = null;
			}
			
			if (this.texOffscreen) {
				gl.deleteTexture(this.texOffscreen);
				this.texOffscreen = null;
			}
		},
		
		enable: function() {
			var gl = this.gl;

			if (!this.bEnabled) {
				this.ensureDrawingObjects();
				
				gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
				gl.viewport(0, 0,
					this.currentTextureSize,
					this.currentTextureSize);
					
				this.bEnabled = true;
			}
		},
		
		disable: function() {
			var gl = this.gl;

			if (this.bEnabled) {
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				this.bEnabled = false;
			}
		},
		
		transferAndDisable: function(targetWidth, targetHeight) {
			if (this.bEnabled) {
				this.calcUVsForRenderTargetSize(targetWidth, targetHeight);
			}
			
			this.disable();
		},
		
		get enabled() {
			return this.bEnabled;
		},
		
		calcUVsForRenderTargetSize: function(w, h) {
			var rw = (w / this.currentTextureSize);
			var rh = (h / this.currentTextureSize);

			var uvs = this.vbSourceArrays.uv;
			uvs[0] =  0;  uvs[1] =  1.0;
			uvs[2] = rw;  uvs[3] =  1.0;
			uvs[4] =  0;  uvs[5] =  1.0-rh;
			uvs[6] = rw;  uvs[7] =  1.0-rh;
		},
		
		ensureDrawingObjects: function() {
			var gl = this.gl;

			if (!this.vbSourceArrays.pos) {
				var poss = new Float32Array(8);
				poss[0] = -1;  poss[1] =  1;
				poss[2] =  1;  poss[3] =  1;
				poss[4] = -1;  poss[5] = -1;
				poss[6] =  1;  poss[7] = -1;

				var uvs = new Float32Array(8);
				uvs[0] = 0;  uvs[1] = 0;
				uvs[2] = 1;  uvs[3] = 0;
				uvs[4] = 0;  uvs[5] = 1;
				uvs[6] = 1;  uvs[7] = 1;

				this.vbSourceArrays.pos = poss;
				this.vbSourceArrays.uv  = uvs;
			}
			
			if (!this.vertexBuffers.pos) {
				this.vertexBuffers.pos = mobmap.GLMobLayer.generateDynamicVBO(gl, this.vbSourceArrays.pos);
				this.vertexBuffers.uv  = mobmap.GLMobLayer.generateDynamicVBO(gl, this.vbSourceArrays.uv);
			}
		}
	};
	
	function calcMin2x(n) {
		// log_2(n)
		var l = Math.ceil(Math.log(n) / Math.log(2.0));
		return Math.pow(2, l);
	}
	
	function testCalcMin2x(){
		var testset = [
		   //in / expected out
			[15 ,  16],
			[16 ,  16],
			[17 ,  32],
			[511,  512],
			[512,  512],
			[513, 1024]
		];
		
		for (var i in testset) {
			var inVal = testset[i][0];
			var expexted = testset[i][1];
			
			console.log(inVal, calcMin2x(inVal), expexted);
		}
	}
	
	aPkg.GLPostProcessor = GLPostProcessor;
})(window.mobmap);