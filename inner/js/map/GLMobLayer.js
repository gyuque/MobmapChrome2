if (!window.mobmap) { window.mobmap={}; }

(function() {
function installMobLayer(pkg) {
	'use strict';
	var kZeroPt = null;
	var tempPt1 = {x:0,y:0};
	var tempPt2 = {x:0,y:0};

	function GLMobLayer() {
		// Initiazlize

		if (!kZeroPt) { kZeroPt = new google.maps.Point(0, 0); }
		this.tempBounds = new mobmap.MapBounds();
		this.canvas = null;
		this.cachedDiv = null;
		this.jCachedDiv = null;
		this.markerPoolStack = new MarkerPoolStack();
		this.bufferCapacityInVertices = 48000;
		this.vertexDimension = 2;
		
		// WebGL objects ------------------------------
		this.gl = null;
		this.vertexShader   = null;
		this.fragmentShader = null;
		this.shaderProgram  = null;
		this.shaderParams = {};
		this.glBuffers = {};
		this.markerTexture = 0;
		this.markerTextureConf = new MarkerTextureConfiguration();
		this.markerTransformMatrix = mat4.create();
		this.nTrianglesBuffered = 0;
		// WebGL objects ------------------------------
		
		// Default values
		this.generatedListeners = [];
		this.targetPane = 'overlayShadow';
		this.canvasOffset = {x: 0, y:0};
		this.canvasSize = {w: 0, h:0};
		this.prevRenderRegion = {minLat:-1, maxLat:-1, minLng:-1, maxLng:-1};
		
		this.ownerObject = null;
		this.canvasReadyCallback = null;
		this.projectionGrid = new mobmap.FastProjectionGrid(9);
		
		// - - - - - - - - - - - - -
		// External class will set this property.
		  this._stockPickPool = null;
		// - - - - - - - - - - - - -
		
		console.log("Generated new GLMobLayer");
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

	GLMobLayer.prototype.willRemove = function() {
		GLMobLayer.clearOverlayMapEvents(this);
	};
	
	GLMobLayer.prototype.onRemove = function() {
		this.canvas.parentNode.removeChild(this.canvas);
	};

	GLMobLayer.prototype.preapareDefaultMarkerPool = function() {
		// Generate a marker pool if there are not any marker pools.
		if (this.markerPoolStack.getCount() < 1) {
			this.markerPoolStack.createPoolOnTop();
		}
	};
	
	GLMobLayer.prototype.getTopMarkerPool = function() {
		var len = this.markerPoolStack.getCount();
		if (len < 1) {
			return null;
		}
		
		return this.markerPoolStack.getAt(len - 1);
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
		var a_tb  = gl.getAttribLocation(prg, 'aTextureBase');
		var u_tex = gl.getUniformLocation(prg, 'texture');
		var u_validUV = gl.getUniformLocation(prg, 'validUV');
		var u_trans = gl.getUniformLocation(prg, 'transform');

		this.shaderParams.vertexPosition = a_pos;
		this.shaderParams.textureCoord   = a_tc;
		this.shaderParams.textureBase    = a_tb;
		this.shaderParams.texture        = u_tex;
		this.shaderParams.validUV        = u_validUV;
		this.shaderParams.transform      = u_trans;
	};
	
	GLMobLayer.prototype.setupGLBuffers = function(gl) {
		var posBufferSize = this.bufferCapacityInVertices * this.vertexDimension;
		var uvBufferSize  = this.bufferCapacityInVertices * 2;
		
		this.glBuffers.arrPositions = new Float32Array(posBufferSize);
		this.glBuffers.vbPositions  = generateDynamicVBO(gl, this.glBuffers.arrPositions);

		this.glBuffers.arrTexcoords = new Float32Array(uvBufferSize);
		this.glBuffers.vbTexcoords  = generateDynamicVBO(gl, this.glBuffers.arrTexcoords);

		this.glBuffers.arrTexbase = new Float32Array(uvBufferSize);
		this.glBuffers.vbTexbase  = generateDynamicVBO(gl, this.glBuffers.arrTexbase);
		
		this.bindBufferArrays();
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
		if (this.isRenderedRegionChanged()) {
			this.renderGL();
			this.updateRenderedRegion();
		}
	};
	
	GLMobLayer.overlaybase_changeCanvasSize = function(w, h) {
		this.canvas.width  = w - 0;
		this.canvas.height = h - 0;
	};
	GLMobLayer.prototype.changeCanvasSize = GLMobLayer.overlaybase_changeCanvasSize;

	GLMobLayer.overlaybase_getCechedJQueryDiv = function() {
		var mapDiv = this.getMap().getDiv();
		if (this.cachedDiv === mapDiv) {
			return this.jCachedDiv;
		} else {
			this.cachedDiv = mapDiv;
			this.jCachedDiv = $(mapDiv);
			return this.jCachedDiv;
		}
	};
	GLMobLayer.prototype.getJQDiv = GLMobLayer.overlaybase_getCechedJQueryDiv;

	GLMobLayer.prototype.calcCurrnetBounds = function(outBounds, marginPixels) {
		var mgn = marginPixels || 0;

		//var ox = this.canvasOffset.x;
		//var oy = this.canvasOffset.y;
		
		var prj = this.getProjection();
		if (!prj) {return false;}
		
		var p1 = tempPt1;
		p1.x = 0;
		p1.y = this.canvasSize.h;

		var p2 = tempPt2;
		p2.x = this.canvasSize.w;
		p2.y = 0;

		var ll1 = prj.fromContainerPixelToLatLng(p1);
		var ll2 = prj.fromContainerPixelToLatLng(p2);
		//console.log(ll1.lat(), ll1.lng(), ll2.lat(), ll2.lng())
		
		return true;
	};

	// Rendering
	GLMobLayer.prototype.renderGL = function() {		
		var gl = this.gl;
		if (!gl) {return;}
		gl.viewport(0, 0, this.canvasSize.w, this.canvasSize.h);

		this.updateProjectionGrid(this.projectionGrid);
//		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ZERO);
		gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		this.renderLayerStack();

		gl.flush();
	};
	
	function putTestMarkers(pl) {
		pl.begin(10);
		var pooledMarkerArray = pl.getArray();
		
		for (var i = 0;i < 10;++i) {
			var mk = pooledMarkerArray[i];
			mk.lat = 35.9;
			mk.lng = 139.7;
		}
	}

	var testcount = 0;
	GLMobLayer.prototype.prepareRendering = function() {
		var gl = this.gl;

		gl.disable(gl.DEPTH_TEST);
		this.nTrianglesBuffered = 0;

		if (this.markerTexture) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.markerTexture);
			this.setupPixelToPixelScale(this.markerTransformMatrix);
		}
		
		gl.useProgram(this.shaderProgram);
		gl.uniform1i(this.shaderParams.texture, 0);
		gl.uniformMatrix4fv(this.shaderParams.transform, false, this.markerTransformMatrix);

		this.calcMarkerUVRange(gl, this.shaderParams.validUV);
	};
	
	GLMobLayer.prototype.calcMarkerUVRange = function(gl, loc) {
		var mgn = 4 / this.markerTextureConf.originalWidth;
		var u_width = this.markerTextureConf.chipWidth / this.markerTextureConf.originalWidth;

		gl.uniform4f(loc, mgn, 0, u_width - mgn, 0);
	};
	
	GLMobLayer.prototype.renderLayerStack = function() {
		if (!this.gl) { return; }
		
		var st = this.markerPoolStack;
		var len = st.getCount();
		for (var i = 0;i < len;++i) {
			var markerPool = st.getAt(i);
			this.prepareRendering();
			this.renderPooledMarkers(markerPool);
		}
	};
	
	GLMobLayer.prototype.renderPooledMarkers = function(pl) {
		if (!pl) {
			throw "MarkerPool must be specified: " + pl;
		}
		
		var m_arr = pl.getArray();
		var len = pl.requestedCount;
		var triCount = 0;
		var lastIndex = len - 1;

		var vlist = this.glBuffers.arrPositions;
		var txlist = this.glBuffers.arrTexcoords;
		var tblist = this.glBuffers.arrTexbase;

		var vi = 0;
		var bi = 0;
		var txi = 0;

		var trisLimit = Math.floor(this.bufferCapacityInVertices / 3);
		// console.log("rendering "+len+" marker polygons");
		
		var texWidth = this.markerTextureConf.originalWidth;
		var texHeight = this.markerTextureConf.originalHeight;
		var u_width = this.markerTextureConf.chipWidth / texWidth;
		var v_height = this.markerTextureConf.chipHeight / texHeight;

		var tempBounds = this.tempBounds;
		this.calcCurrnetBounds(tempBounds, 16);

		for (var i = 0;i < len;++i) {
			var mk = m_arr[i];
			this.projectionGrid.calc(mk);

			var sx = mk.screenX;
			var sy = mk.screenY;
			var cx = 7;
			var cy = 7;

			// Append positions
			vlist[vi  ] = sx - cx       ;  vlist[vi+1] = sy - cy         ;
			vlist[vi+2] = vlist[vi] + 32;  vlist[vi+3] = vlist[vi+1]     ;
			vlist[vi+4] = vlist[vi]     ;  vlist[vi+5] = vlist[vi+1] + 32;
			vi += 6;
			
			// Append texture coordinates (fixed + variable = final UV)
//			txi += this.setMarkerTextureCoords(txlist, txi, 0.0, 0.0, 0.5, 0.5);

			//   Fixed UV
			txi += this.setMarkerTextureCoords(txlist, txi, 0.0, 0.0, u_width * 2.0, 1.0);

			//   Variable UV
			bi += this.setMarkerTextureCoords(tblist, bi, mk.chipX / texWidth, mk.chipY / texHeight, 0.0, 0.0);

			++triCount;
			if (
				triCount >= trisLimit || // buffer is full
				i === lastIndex // flush at last loop
				) {
				
				this.nTrianglesBuffered = triCount;
				this.drawBufferedPrimitives(this.gl);
				
				vi = txi = bi = triCount = 0;
			}
		}
	};
	
	GLMobLayer.prototype.drawBufferedPrimitives = function(gl) {
		if (this.nTrianglesBuffered < 1) {
			return;
		}


		// Write to buffer
		this.updateBufferContent();
		
		// Setup buffer objects -----------------------
		//  position buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbPositions);
		gl.enableVertexAttribArray(this.shaderParams.vertexPosition);
		gl.vertexAttribPointer(
			this.shaderParams.vertexPosition,
			this.vertexDimension, // components per vertex
			gl.FLOAT, false, 0, 0);
			
		//  texture coords buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbTexcoords);
		gl.enableVertexAttribArray(this.shaderParams.textureCoord);
		gl.vertexAttribPointer(
			this.shaderParams.textureCoord,
			2, // components per vertex
			gl.FLOAT, false, 0, 0);

		//  texture coords buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbTexbase);
		gl.enableVertexAttribArray(this.shaderParams.textureBase);
		gl.vertexAttribPointer(
			this.shaderParams.textureBase,
			2, // components per vertex
			gl.FLOAT, false, 0, 0);
			
		// Run -----------------------
		gl.drawArrays(gl.TRIANGLES, 0, this.nTrianglesBuffered * 3);
	};
	
	GLMobLayer.prototype.setupPixelToPixelScale = function(m) {
		var w = this.canvasSize.w || 1;
		var h = this.canvasSize.h || 1;
		
		var wScale =  2.0 / w;
		var hScale = -2.0 / h;
		
		var tmp1 = _tempM4;
		
		mat4.identity(m);
		mat4.translate(tmp1, m, [-1, 1, 0]);
		mat4.scale(m, tmp1, [wScale, hScale, 1]);
	};
	
	GLMobLayer.prototype.resetTransform = function() {
		mat4.identity(_tempM4);
		
		var gl = this.gl;
		gl.uniformMatrix4fv(this.shaderParams.transform, false, _tempM4);
	};


	GLMobLayer.overlaybase_updateProjectionGrid = function(grid) {
		// Fetch map status
		var map = this.getMap();
		var pj = this.getProjection();
		if (!pj) {return false;}
		
		var mapNE = map.getBounds().getNorthEast();
		var mapSW = map.getBounds().getSouthWest();

		grid.setOffset(-this.canvasOffset.x, -this.canvasOffset.y);
		grid.update(pj, mapSW.lat(), mapSW.lng(), mapNE.lat(), mapNE.lng());
		return true;
	};
	GLMobLayer.prototype.updateProjectionGrid = GLMobLayer.overlaybase_updateProjectionGrid;


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
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.glBuffers.arrPositions);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbTexcoords);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.glBuffers.arrTexcoords);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbTexbase);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.glBuffers.arrTexbase);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};
	
	GLMobLayer.prototype.bindBufferArrays = function() {
		var gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbPositions);
		gl.bufferData(gl.ARRAY_BUFFER, this.glBuffers.arrPositions, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbTexcoords);
		gl.bufferData(gl.ARRAY_BUFFER, this.glBuffers.arrTexcoords, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbTexbase);
		gl.bufferData(gl.ARRAY_BUFFER, this.glBuffers.arrTexbase, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};
	
	GLMobLayer.prototype.setMarkerImage = function(img) {
		if (!this.gl) { return false; }
		this.destroyMarkerTexture();
		
		this.markerTextureConf.originalWidth  = img.width - 0;
		this.markerTextureConf.originalHeight = img.height - 0;
		
		var tex = GLMobLayer.createTextureObject(this.gl, img);
		this.markerTexture = tex;
		this.renderGL();
		return true;
	};

	GLMobLayer.prototype.setCurrentMarkerTexture = function(tex) {
		this.markerTexture = tex;
	};
	
	GLMobLayer.createTextureObject = function(gl, sourceImage) {
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImage);
		gl.generateMipmap(gl.TEXTURE_2D);
		
		return tex;
	};
	
	GLMobLayer.prototype.destroyMarkerTexture = function() {
		if (this.markerTexture) {
			this.gl.deleteTexture(this.markerTexture);
			this.markerTexture = null;
		}
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

	// Dirty check
	GLMobLayer.overlaybase_resetRenderedRegion = function() {
		var r = this.prevRenderRegion;
		r.minLat = r.maxLat = r.minLng = r.maxLng = -1;
	};

	GLMobLayer.overlaybase_updateRenderedRegion = function() {
		var bnd = this.getMap().getBounds();
		var mapNE = bnd.getNorthEast();
		var mapSW = bnd.getSouthWest();

		var r = this.prevRenderRegion;
		r.minLat = mapSW.lat();
		r.maxLat = mapNE.lat();
		r.minLng = mapSW.lng();
		r.maxLng = mapNE.lng();
	};

	GLMobLayer.overlaybase_isRenderedRegionChanged = function() {
		var bnd = this.getMap().getBounds();
		var mapNE = bnd.getNorthEast();
		var mapSW = bnd.getSouthWest();
		
		var r = this.prevRenderRegion;
		return (
			r.minLat != mapSW.lat() ||
			r.maxLat != mapNE.lat() ||
			r.minLng != mapSW.lng() ||
			r.maxLng != mapNE.lng()
		);
	};

	GLMobLayer.prototype.resetRenderedRegion = GLMobLayer.overlaybase_resetRenderedRegion;
	GLMobLayer.prototype.updateRenderedRegion = GLMobLayer.overlaybase_updateRenderedRegion;
	GLMobLayer.prototype.isRenderedRegionChanged = GLMobLayer.overlaybase_isRenderedRegionChanged;

	// Utilities
	GLMobLayer.setupOverlayMapEvents = function(lyr) {
		var m = lyr.getMap();
		lyr.zoomListener = google.maps.event.addListener(m, 'zoom_changed', lyr.onMapZoomChanged.bind(lyr) );
		lyr.dragListener = google.maps.event.addListener(m, 'drag', lyr.onMapZoomDragged.bind(lyr) );
		lyr.sizeListener = google.maps.event.addListener(m, 'resize', lyr.onMapSized.bind(lyr));

		lyr.generatedListeners.push(lyr.zoomListener);
		lyr.generatedListeners.push(lyr.dragListener);
		lyr.generatedListeners.push(lyr.sizeListener);
		
		if (lyr.onMapCenterChanged) {
			lyr.centerListener = google.maps.event.addListener(m, 'center_changed', lyr.onMapCenterChanged.bind(lyr) );
			lyr.generatedListeners.push(lyr.centerListener);
		}
	};
	
	GLMobLayer.clearOverlayMapEvents = function(lyr) {
		for (var i in lyr.generatedListeners) {
			var l = lyr.generatedListeners[i];
			google.maps.event.removeListener(l);
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
		if (!kZeroPt) { kZeroPt = new google.maps.Point(0, 0); }

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
		this.array = [];
		this.currentCapacity = 0;
		this.requestedCount = 0;
	}
	
	MarkerPool.prototype = {
		begin: function(reqCount) {
			this.requestedCount = reqCount;
			this.expand(reqCount);
		},
		
		expand: function(newSize) {
			if (this.array.length >= newSize) {
				return;
			}
			
			this.array.length = newSize;
			for (var i = 0;i < newSize;++i) {
				if (!this.array[i]) {
					this.array[i] = new MarkerDisplayData();
				}
			}

			this.currentCapacity = newSize;
		},
		
		clear: function() {
			this.requestedCount = 0;
		},
		
		getArray: function() {
			return this.array;
		}
	};
	
	// -----------
	function MarkerPoolStack() {
		this.stack = [];
	}
	
	MarkerPoolStack.prototype = {
		getCount: function() {
			return this.stack.length;
		},
		
		getAt: function(i) {
			return this.stack[i] || null;
		},
		
		createPoolOnTop: function() {
			var mp = new MarkerPool();
			this.stack.push(mp);
			return mp;
		}
	};

	// -----------
	function MarkerDisplayData() {
		this.used = false;
		this.screenX = this.screenY = this.lat = this.lng = 0;
		this.chipX = 0;
	}
	
	function MarkerTextureConfiguration() {
		this.originalWidth  = 1;
		this.originalHeight = 1;
		this.chipWidth      = 16;
		this.chipHeight     = 16;
	}

	// Shaders ---------------------------------------------
	var FillTestVertexShader = [
		"attribute vec2 aVertexPosition;",
		"attribute vec2 aTextureCoord;",
		"attribute vec2 aTextureBase;",
		"varying vec2 vTextureCoord;",
		"varying vec2 vTextureBase;",
		"uniform mat4 transform;",
		"void main(void) {",
		" vTextureCoord = aTextureCoord;",
		" vTextureBase  = aTextureBase;",
		" gl_Position = transform * vec4(aVertexPosition, 0.0, 1.0);",
		"}"
	].join("\n");

	var FillTestFragmentShader = [
		"precision mediump float;",
		"uniform sampler2D texture;",
		"uniform vec4 validUV;",
		"varying vec2 vTextureCoord;",
		"varying vec2 vTextureBase;",
		"void main(void) {",
//		" if(vTextureCoord.x < 0.06 || vTextureCoord.y < 0.06 || vTextureCoord.x > 0.19 || vTextureCoord.y > 0.19) {discard;}",
//		" if(vTextureCoord.x < 0.06 || vTextureCoord.y < 0.12 || vTextureCoord.x > 0.19 || vTextureCoord.y > 0.38) {discard;}",

		// rgba -> u1,v2,u2,v2
		" if(vTextureCoord.x < validUV.r || vTextureCoord.y < 0.12 || vTextureCoord.x > validUV.b || vTextureCoord.y > 0.38) {discard;}",

		" vec4 texel = texture2D(texture, vTextureCoord + vTextureBase);",
//		" if (texel.z < 0.001) {discard;} ",
		" gl_FragColor  = texel;",
		"}"
	].join("\n");
	
	pkg.MapBounds = function() {
		this.lngMin = 0;
		this.latMin = 0;
		this.lngMax = 0;
		this.latMax = 0;
	};
	
	var _tempM4 = mat4.create();
	pkg.GLMobLayer = GLMobLayer;
	pkg.GLMobLayer.MarkerTextureConfiguration = MarkerTextureConfiguration;
}

if (window.ENABLE_MOBMAP_LAZY_LOAD) {
	window.mobmap.installMobLayer = function() { installMobLayer(window.mobmap); };
} else {
	installMobLayer(window.mobmap);
}

})();