if (!window.mobmap) { window.mobmap={}; }

(function(pkg){
	'use strict';
	var kZeroPt = null;

	function GLMobLayer() {
		// Initiazlize

		if (!kZeroPt) { kZeroPt = new google.maps.Point(0, 0); }
		this.canvas = null;
		this.cachedDiv = null;
		this.jCachedDiv = null;
		this.markerPool = new MarkerPool();
		this.bufferCapacityInVertices = 1200;
		this.vertexDimension = 3;
		
		// WebGL objects ------------------------------
		this.gl = null;
		this.vertexShader   = null;
		this.fragmentShader = null;
		this.shaderProgram  = null;
		this.shaderParams = {};
		this.glBuffers = {};
		this.markerTexture = 0;
		this.markerTransformMatrix = mat4.create();  
		// WebGL objects ------------------------------
		
		// Default values
		this.targetPane = 'overlayShadow';
		this.canvasOffset = {x: 0, y:0};
		this.canvasSize = {w: 0, h:0};
		
		this.canvasReadyCallback = null;
		this.projectionGrid = new mobmap.FastProjectionGrid(9);
	}
	
	// Inherit
	GLMobLayer.prototype = new google.maps.OverlayView();

	// View management ------------------------------------------
	GLMobLayer.prototype.draw = function() {
		if (!this.canvas) {
			this.canvas = $H('canvas');

			this.gl = this.canvas.getContext("webgl");
			if (!this.gl) {
				console.log("WARNING: cannot get 3d context");
			}
			this.initializeGLObjects(this.gl);

			var panes = this.getPanes();
			panes[this.targetPane].appendChild( this.canvas );
			
			GLMobLayer.setupOverlayMapEvents(this);
			
			if (this.canvasReadyCallback) {
				this.canvasReadyCallback();
			}
		}
		
		this.locateCanvas();
	};

	GLMobLayer.prototype.initializeGLObjects = function(gl) {
		var vs_source = FillTestVertexShader;
		var fs_source = FillTestFragmentShader;

		// Vertex shader
		var vs = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vs, vs_source);
		gl.compileShader(vs);
		var vs_ok = checkWGLShaderError(gl, vs); // << error check
		
		// Fragment shader
		var fs = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fs, fs_source);
		gl.compileShader(fs);
		var fs_ok = checkWGLShaderError(gl, fs); // << error check
		
		this.vertexShader = vs;
		this.fragmentShader = fs;
		
		this.setupShaderProgram(gl, vs, fs);
		this.setupGLBuffers(gl);
	};
	
	GLMobLayer.prototype.setupShaderProgram = function(gl, vs, fs) {
		var prg = gl.createProgram();
		this.shaderProgram = prg;
		
		gl.attachShader(prg, vs);
		gl.attachShader(prg, fs);
		gl.linkProgram(prg);

		if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
			console.log("!!Link failed!!");
			alert(gl.getProgramInfoLog(prg));
		}
		
		// Refer shader parameters
		var a_pos = gl.getAttribLocation(prg, 'aVertexPosition');
		var a_tc  = gl.getAttribLocation(prg, 'aTextureCoord');
		var u_tex = gl.getUniformLocation(prg, 'texture');
		var u_trans = gl.getUniformLocation(prg, 'transform');

		this.shaderParams.vertexPosition = a_pos;
		this.shaderParams.textureCoord   = a_tc;
		this.shaderParams.texture        = u_tex;
		this.shaderParams.transform      = u_trans;
	};
	
	GLMobLayer.prototype.setupGLBuffers = function(gl) {
		var posBufferSize = this.bufferCapacityInVertices * this.vertexDimension;
		var uvBufferSize  = this.bufferCapacityInVertices * 2;
		
		this.glBuffers.arrPositions = new Float32Array(posBufferSize);
		this.glBuffers.vbPositions  = generateDynamicVBO(gl, this.glBuffers.arrPositions);

		this.glBuffers.arrTexcoords = new Float32Array(uvBufferSize);
		this.glBuffers.vbTexcoords  = generateDynamicVBO(gl, this.glBuffers.arrTexcoords);
	};
	
	GLMobLayer.prototype.locateCanvas = function() {
		var d = this.getJQDiv();
		var cv = this.canvas;

		var should_resize = GLMobLayer.calcOverlayCanvasSize(this.canvasSize, d);
		if (should_resize) {
			this.changeCanvasSize(this.canvasSize.w , this.canvasSize.h);
		}
		
		GLMobLayer.adjustOverlayCanvasPosition(this, this.canvasOffset);
		//this.canvas.style.backgroundColor = "rgba(0,0,0,0.8)";
		this.renderGL();
	};
	
	GLMobLayer.prototype.changeCanvasSize = function(w, h) {
		this.canvas.width  = w - 0;
		this.canvas.height = h - 0;
	};
	
	GLMobLayer.prototype.getJQDiv = function() {
		var mapDiv = this.getMap().getDiv();
		if (this.cachedDiv === mapDiv) {
			return this.jCachedDiv;
		} else {
			this.cachedDiv = mapDiv;
			this.jCachedDiv = $(mapDiv);
			return this.jCachedDiv;
		}
	};

	// Rendering
	GLMobLayer.prototype.renderGL = function() {
		var gl = this.gl;
		if (!gl) {return;}
		
		this.updateProjectionGrid();
		
		gl.clearColor(0.0, 1.0, 0.0, 0.5);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		//gl.vertexPointer(3, GL_FLOAT, 0, points);
		this.prepareRendering();
		gl.drawArrays(gl.TRIANGLES, 0, 3);
		
		gl.flush();
	};

	var testcount = 0;
	GLMobLayer.prototype.prepareRendering = function() {
		var gl = this.gl;
		gl.disable(gl.DEPTH_TEST);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.markerTexture);
		
if(!this.testMK){ this.testMK = new MarkerDisplayData(); }
		
		this.testMK.lat = 35.9;
		this.testMK.lng = 139.7;
		this.projectionGrid.calc(this.testMK);
		console.log(this.testMK.screenX, this.testMK.screenY);
		
		this.setupPixelToPixelScale(this.markerTransformMatrix);
		
		var vlist = this.glBuffers.arrPositions;
		vlist[0] = 0;   vlist[1] =  0.0; vlist[2] = 0;
		vlist[3] = 2; vlist[4]   =  0.0; vlist[5] = 0;
		vlist[6] = 1; vlist[7]   = -1; vlist[8] = 0;
		
		vlist[7] -= Math.sin(++testcount * 0.1) * 0.1;
		
		var txlist = this.glBuffers.arrTexcoords;
		this.setMarkerTextureCoords(txlist, 0, 0.0, 0.0, 0.5, 0.5);
		
		this.updateBufferContent();
		gl.useProgram(this.shaderProgram);
		gl.uniform1i(this.shaderParams.texture, 0);
		gl.uniformMatrix4fv(this.shaderParams.transform, false, this.markerTransformMatrix);
		
		// Use position buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbPositions);
		gl.enableVertexAttribArray(this.shaderParams.vertexPosition);
		gl.vertexAttribPointer(
			this.shaderParams.vertexPosition,
			this.vertexDimension, // components per vertex
			gl.FLOAT, false, 0, 0);
			
		// Use texture coords buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbTexcoords);
		gl.enableVertexAttribArray(this.shaderParams.textureCoord);
		gl.vertexAttribPointer(
			this.shaderParams.textureCoord,
			2, // components per vertex
			gl.FLOAT, false, 0, 0);
	};
	
	GLMobLayer.prototype.setupPixelToPixelScale = function(m) {
		var w = this.canvasSize.width || 1;
		var h = this.canvasSize.height || 1;
		
		var wScale =  2.0 / w;
		var hScale = -2.0 / h;
		
		mat4.identity(m);
		//mat4.
	};
	
	GLMobLayer.prototype.updateProjectionGrid = function() {
		var gr = this.projectionGrid;
		
		// Fetch map status
		var map = this.getMap();
		var pj = this.getProjection();
		var mapNE = map.getBounds().getNorthEast();
		var mapSW = map.getBounds().getSouthWest();

		gr.setOffset(-this.canvasOffset.x, -this.canvasOffset.y);
		gr.update(pj, mapSW.lat(), mapSW.lng(), mapNE.lat(), mapNE.lng());
	};
	
	GLMobLayer.prototype.setMarkerTextureCoords = function(array, basePos, u1, v1, us, vs) {
		array[basePos    ] = u1;
		array[basePos + 1] = v1;

		array[basePos + 2] = u1 + us;
		array[basePos + 3] = v1;

		array[basePos + 4] = u1;
		array[basePos + 5] = v1 + vs;
		
		return 6;
	};
	
	GLMobLayer.prototype.updateBufferContent = function() {
		var gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbPositions);
		gl.bufferData(gl.ARRAY_BUFFER, this.glBuffers.arrPositions, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbTexcoords);
		gl.bufferData(gl.ARRAY_BUFFER, this.glBuffers.arrTexcoords, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};
	
	GLMobLayer.prototype.setMarkerImage = function(img) {
		var gl = this.gl;
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);
		this.markerTexture = tex;
		
		this.renderGL();
	};

	// Map event handlers --------------------------------------
	GLMobLayer.prototype.onMapZoomChanged = function() {
	};

	GLMobLayer.prototype.onMapZoomDragged = function() {
		this.locateCanvas();
	};

	GLMobLayer.prototype.onMapSized = function() {
		this.locateCanvas();
	};

	GLMobLayer.prototype.onMapCenterChanged = function() {
		this.locateCanvas();
	};


	// Utilities
	GLMobLayer.setupOverlayMapEvents = function(lyr) {
		var m = lyr.getMap();
		lyr.zoomListener = google.maps.event.addListener(m, 'zoom_changed', lyr.onMapZoomChanged.bind(lyr) );
		lyr.dragListener = google.maps.event.addListener(m, 'drag', lyr.onMapZoomDragged.bind(lyr) );
		lyr.sizeListener = google.maps.event.addListener(m, 'resize', lyr.onMapSized.bind(lyr));
		
		if (lyr.onMapCenterChanged) {
			lyr.centerListener = google.maps.event.addListener(m, 'center_changed', lyr.onMapCenterChanged.bind(lyr) );
		}
	};
	
	GLMobLayer.calcOverlayCanvasSize = function(canvasSize, jContainerDiv) {
		var oldw = canvasSize.w;
		var oldh = canvasSize.h;

		canvasSize.w = jContainerDiv.width();
		canvasSize.h = jContainerDiv.height();
		
		// Size changed?
		return (oldw != canvasSize.w) || (oldh != canvasSize.h);
	};

	GLMobLayer.adjustOverlayCanvasPosition = function(lyr, canvasOffset) {
		var pj = lyr.getProjection();
		var ll = pj.fromDivPixelToLatLng(kZeroPt);
		var pt = pj.fromLatLngToContainerPixel(ll);

		canvasOffset.x = Math.floor(-pt.x + 0.00001);
		canvasOffset.y = Math.floor(-pt.y + 0.00001);

		var st = lyr.canvas.style;
		st.position = "absolute";
		st.left = canvasOffset.x + "px";
		st.top  = canvasOffset.y + "px";
		st.webkitUserSelect = "none";
	};

	function checkWGLShaderError(gl, shader) {
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			console.log(gl.getShaderInfoLog(shader));
			return false;
		}
		
		return true;
	}

	function generateDynamicVBO(gl, sourceArray) {
		var vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, sourceArray, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		return vbo;
	}

	// -----------
	function MarkerPool() {
		
	}
	
	MarkerPool.prototype = {
		
	};

	// -----------
	function MarkerDisplayData() {
		this.screenX = this.screenY = this.lat = this.lng = 0;
		
	}
	

	// Shaders ---------------------------------------------
	var FillTestVertexShader = [
		"attribute vec3 aVertexPosition;",
		"attribute vec2 aTextureCoord;",
		"varying vec2 vTextureCoord;",
		"uniform mat4 transform;",
		"void main(void) {",
		" vTextureCoord = aTextureCoord;",
		" gl_Position = transform * vec4(aVertexPosition, 1.0);",
		"}"
	].join("\n");

	var FillTestFragmentShader = [
		"precision mediump float;",
		"uniform sampler2D texture;",
		"varying vec2 vTextureCoord;",
		"void main(void) {",
		" vec4 texel = texture2D(texture, vTextureCoord);",
		" gl_FragColor  = texel;",
		"}"
	].join("\n");
	
	pkg.GLMobLayer = GLMobLayer;
})(window.mobmap);