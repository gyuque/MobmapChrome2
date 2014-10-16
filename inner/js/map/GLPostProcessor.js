if (!window.mobmap) { window.mobmap={}; }

(function(aPkg) {
	'use strict';

	function GLPostProcessor(gl) {
		this.gl = gl;
		this.texOffscreen = null;
		this.fbo = null;
		this.currentTextureSize = 0;
		this.shaderData = {program: null};

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

//			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

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
				this.ensureShader();
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
				this.prepareDefaultRenderTarget(targetWidth, targetHeight);
				this.calcUVsForRenderTargetSize(targetWidth, targetHeight);
				this.useTextureCoordsBuffer();
				this.usePositionsBuffer();
				this.useTexture();
				this.runDraw();
			}
			
			this.disable();
		},
		
		get enabled() {
			return this.bEnabled;
		},
		
		get offscreenWidth() {
			return this.currentTextureSize;
		},
		
		get offscreenHeight() {
			return this.currentTextureSize;
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
		
		prepareDefaultRenderTarget: function(targetWidth, targetHeight) {
			var gl = this.gl;
			
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, targetWidth, targetHeight);
			
			gl.useProgram(this.shaderData.program);
		},
		
		useTextureCoordsBuffer: function() {
			var gl = this.gl;
			var vbo = this.vertexBuffers.uv;
			var arr = this.vbSourceArrays.uv;
			
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, arr);

			gl.enableVertexAttribArray(this.shaderData.aTextureCoord);
			gl.vertexAttribPointer(
				this.shaderData.aTextureCoord,
				2, // components per vertex
				gl.FLOAT, false, 0, 0);
		},
		
		usePositionsBuffer: function() {
			var gl = this.gl;
			var vbo = this.vertexBuffers.pos;
			
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.enableVertexAttribArray(this.shaderData.aPos);
			gl.vertexAttribPointer(
				this.shaderData.aPos,
				2, // components per vertex
				gl.FLOAT, false, 0, 0);
		},
		
		useTexture: function() {
			var gl = this.gl;
			
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.texOffscreen);
			gl.uniform1i(this.shaderData.texture, 0);

			// gl.uniform1f(this.shaderData.enableMetaball, this.useMetaball ? 1 : 0);
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
		},
		
		ensureShader: function() {
			if (!this.shaderData.program) {
				var vs = createAndCompileShader(this.gl, kSimpleVertexShader, false);
				var fs = createAndCompileShader(this.gl, kSimpleFragmentShader, true);

				this.shaderData.program = this.createShaderProgram(vs, fs);
				this.pickShaderParams(this.gl, this.shaderData, this.shaderData.program);
			}
		},
		
		createShaderProgram: function(vs, fs) {
			var gl = this.gl;

			var program = gl.createProgram();
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
	
			gl.linkProgram(program);
			
			if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
				console.log("** shader link failed **");
				return null;
			}

			return program;
		},
		
		pickShaderParams: function(gl, outObj, program) {
			outObj.aPos = gl.getAttribLocation(program, 'aPos');
			outObj.aTextureCoord = gl.getAttribLocation(program, 'aTextureCoord');
			outObj.texture = gl.getUniformLocation(program, 'texture');
			// outObj.enableMetaball = gl.getUniformLocation(program, 'enableMetaball');
		},
		
		runDraw: function() {
			var gl = this.gl;

			gl.enable(gl.BLEND);
			gl.disable(gl.DEPTH_TEST);

			gl.clearColor(0.0, 0.0, 0.0, 0.0);
			gl.clearDepth(1.0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

			gl.flush();
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
	
	function createAndCompileShader(gl, source, is_fs) {
		// Vertex shader
		var sh = gl.createShader(is_fs ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
		gl.shaderSource(sh, source);
		gl.compileShader(sh);
		var ok = mobmap.GLMobLayer.checkWGLShaderError(gl, sh); // << error check
		if (!ok) {
			console.log("** shader compile error **");
		}
		
		return sh;
	}

	var kSimpleVertexShader = [
		'attribute vec2 aPos;',
		'attribute vec2 aTextureCoord;',
		'varying vec2 vTextureCoord;',
		'void main(void) {',
		'	vTextureCoord = aTextureCoord;',
		'	gl_Position = vec4(aPos, 0.0, 1.0);',
		'}'
	].join("\n") ;

	var kSimpleFragmentShader = [
		'precision mediump float;',
		'uniform sampler2D texture;',
		'varying vec2 vTextureCoord;',
		'void main(void) {',
		'	vec4 texel = texture2D(texture, vTextureCoord);',
		
		'	float avg = (texel.r + texel.g + texel.b) / 3.0;',
		
		'	gl_FragColor = vec4(avg,avg,avg,texel.a);',
		'}'
	].join("\n") ;

	aPkg.GLPostProcessor = GLPostProcessor;
})(window.mobmap);