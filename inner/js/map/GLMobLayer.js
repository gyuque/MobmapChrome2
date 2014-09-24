if (!window.mobmap) { window.mobmap={}; }

(function() {
function installMobLayer(pkg) {
	'use strict';
	var kZeroPt = null;
	var SharedCloudImage = null;
	var tempPt1 = {x:0,y:0};
	var tempPt2 = {x:0,y:0};
	var gNextRenderingID = 1;
	var labelsTempBuffer = [];
	var labelsOwnerTempBuffer = [];

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
		this.shaderType = GLMobLayer.ShaderType.Normal;
		this.vertexShader   = null;
		this.fragmentShader = null;
		this.shaderProgram  = null;
		this.shaderParams = {};
		this.colorLineShaderObjects = { shaderParams:{} };
		this.labelShaderObjects = { shaderParams:{} };
		this.glBuffers = {};
		this.markerTexture = 0;
		this.markerTextureConf = new MarkerTextureConfiguration();
		this.markerTransformMatrix = mat4.create();
		this.nTrianglesBuffered = 0;
		this.nSegmentsBuffered = 0;
		this.labelRenderer = null;
		// WebGL objects ------------------------------
		
		// Default values
		this.visible = true;
		this.enableTailDraw = false;
		this.enableLabel = true;
		this.tailWidth = 1;
		this.tailDirectionColorEnabled = false;
		this.timeDirection = 0;
		this.composition = kMarkerCompositionNormal;
		this.showTyphoonCloud = true;
		this.generatedListeners = [];
		this.targetPane = 'overlayLayer';
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
	
	GLMobLayer.ShaderType = {
		Normal: 0,
		Typhoon: 1
	};
	
	GLMobLayer.ensureSharedCloudImage = function(callback) {
		if (!SharedCloudImage) {
			SharedCloudImage = new Image();
			SharedCloudImage.onload = function() { callback(SharedCloudImage); } ;
			SharedCloudImage.src = CloudImageDataURI;
		} else {
			callback(SharedCloudImage);
		}
	};
	
	// Inherit
	GLMobLayer.prototype = new google.maps.OverlayView();

	GLMobLayer.overlaybase_setVisibility = function(v) { this.visible = v; };
	GLMobLayer.prototype.setVisibility = GLMobLayer.overlaybase_setVisibility;
	GLMobLayer.prototype.setTimeDirection = function(timeDirection) { this.timeDirection = timeDirection; };
	GLMobLayer.prototype.setShowTyphoonCloud = function(s) { this.showTyphoonCloud = s; };
	GLMobLayer.prototype.setMarkerComposition = function(c) { this.composition = c; };
	GLMobLayer.prototype.setTailDrawEnabled = function(e) { this.enableTailDraw = e; };
	GLMobLayer.prototype.setTailWidth = function(w) { this.tailWidth = w; };
	GLMobLayer.prototype.setTailDirectionColorEnabled = function(e) { this.tailDirectionColorEnabled = e; };

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
		this.compileColorLineShader(gl);
		
		if (this.shaderType === GLMobLayer.ShaderType.Normal) {
			this.compileNormalMarkerShader(gl);
		} else {
			this.compileTyphoonMarkerShader(gl);
		}
		
		this.setupShaderProgram(gl,
			this.vertexShader,
			this.fragmentShader);
		
		this.setupColoeLineShaderProgram(
			this.colorLineShaderObjects,
			gl,
			this.colorLineShaderObjects.vertexShader,
			this.colorLineShaderObjects.fragmentShader)
		
		this.setupGLBuffers(gl);
	};

	GLMobLayer.prototype.compileNormalMarkerShader = function(gl) {
		this.compileShaderPair(this, gl, FillTestVertexShader, FillTestFragmentShader);
	};
	
	GLMobLayer.prototype.compileTyphoonMarkerShader = function(gl) {
		this.compileShaderPair(this, gl, FillTestVertexShader, TyphoonFragmentShader);
	};

	GLMobLayer.prototype.compileColorLineShader = function(gl) {
		this.compileShaderPair(this.colorLineShaderObjects, gl,
			ColorLineVertexShader, ColorLineFragmentShader);
	};

	GLMobLayer.prototype.compileLabelShader = function(gl) {
		// IMPLEMENT HERE
	};

	GLMobLayer.prototype.compileShaderPair = function(outObj, gl, vs_source, fs_source) {
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
		
		outObj.vertexShader = vs;
		outObj.fragmentShader = fs;
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
		var u_animationT = gl.getUniformLocation(prg, 'animationT');
		var u_trans = gl.getUniformLocation(prg, 'transform');

		this.shaderParams.vertexPosition = a_pos;
		this.shaderParams.textureCoord   = a_tc;
		this.shaderParams.textureBase    = a_tb;
		this.shaderParams.texture        = u_tex;
		this.shaderParams.validUV        = u_validUV;
		this.shaderParams.transform      = u_trans;
		this.shaderParams.animationT     = u_animationT;
		
		this.shaderParams.taPrevTime = -9999;
		this.shaderParams.taCurrentAngle = 0;
	};
	
	GLMobLayer.prototype.setupColoeLineShaderProgram = function(outObj, gl, vs, fs) {
		var prg = gl.createProgram();
		outObj.shaderProgram = prg;
		
		gl.attachShader(prg, vs);
		gl.attachShader(prg, fs);
		gl.linkProgram(prg);

		if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
			console.log("!!Link failed!!");
			alert(gl.getProgramInfoLog(prg));
		}

		var a_pos = gl.getAttribLocation(prg, 'aVertexPosition');
		var a_col = gl.getAttribLocation(prg, 'aColor');
		var u_trans = gl.getUniformLocation(prg, 'transform');

		outObj.shaderParams.vertexPosition = a_pos;
		outObj.shaderParams.vertexColor    = a_col;
		outObj.shaderParams.transform      = u_trans;
	};

	GLMobLayer.prototype.setupLabelShaderProgram = function(outObj, gl, vs, fs) {
		var prg = gl.createProgram();

		outObj.shaderProgram = prg;
		gl.attachShader(prg, vs);
		gl.attachShader(prg, fs);
		gl.linkProgram(prg);

		if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
			console.log("!!Link failed!!");
			alert(gl.getProgramInfoLog(prg));
		}

	};

	GLMobLayer.prototype.setupGLBuffers = function(gl) {
		var posBufferSize = this.bufferCapacityInVertices * this.vertexDimension;
		var uvBufferSize  = this.bufferCapacityInVertices * 2;
		var clrBufferSize = this.bufferCapacityInVertices * 4;
		
		this.glBuffers.arrPositions = new Float32Array(posBufferSize);
		this.glBuffers.vbPositions  = generateDynamicVBO(gl, this.glBuffers.arrPositions);

		this.glBuffers.arrTexcoords = new Float32Array(uvBufferSize);
		this.glBuffers.vbTexcoords  = generateDynamicVBO(gl, this.glBuffers.arrTexcoords);

		this.glBuffers.arrTexbase = new Float32Array(uvBufferSize);
		this.glBuffers.vbTexbase  = generateDynamicVBO(gl, this.glBuffers.arrTexbase);
		
		this.glBuffers.arrColors = new Uint8Array(clrBufferSize);
		this.glBuffers.vbColors = generateDynamicVBO(gl, this.glBuffers.arrColors);
		
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
		if (this.composition === kMarkerCompositionNormal) {
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		} else {
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.SRC_ALPHA, gl.ONE);
		}
		
		gl.enable(gl.BLEND);
		gl.disable(gl.DEPTH_TEST);
		
		gl.clearColor(0.0, 0.0, 0.0, 0.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		if (this.visible) {
			this.renderLayerStack();
		}
		
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

		gl.useProgram(this.colorLineShaderObjects.shaderProgram);
		gl.uniformMatrix4fv(this.colorLineShaderObjects.shaderParams.transform, false, this.markerTransformMatrix);
		gl.lineWidth(this.tailWidth);

		gl.useProgram(this.shaderProgram);
		gl.uniform1i(this.shaderParams.texture, 0);
		gl.uniformMatrix4fv(this.shaderParams.transform, false, this.markerTransformMatrix);

		if (this.shaderType === GLMobLayer.ShaderType.Normal) {
			this.calcMarkerUVRange(gl, this.shaderParams.validUV);
		} else {
			this.advanceTyphoonAnimation(gl);
		}
	};
	
	GLMobLayer.prototype.calcMarkerUVRange = function(gl, loc) {
		var u_width = this.markerTextureConf.chipWidth / this.markerTextureConf.originalWidth;
		if (this.markerTextureConf.enableCrop) {
			var mgn = 4 / this.markerTextureConf.originalWidth;
			gl.uniform4f(loc, mgn, 0.12, u_width - mgn, 0.38);
		} else {
			gl.uniform4f(loc, 0.0001, 0.0001, u_width, 0.4999);
		}
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
		
		gNextRenderingID = (gNextRenderingID + 1) & 0xffffff;
		var m_arr = pl.getArray();
		var len = pl.requestedCount;
		var triCount = 0;
		var lastIndex = len - 1;

		var vlist = this.glBuffers.arrPositions;
		var txlist = this.glBuffers.arrTexcoords;
		var tblist = this.glBuffers.arrTexbase;
		var cllist = this.glBuffers.arrColors;

		var vi = 0;
		var bi = 0;
		var txi = 0;

		var trisLimit = Math.floor(this.bufferCapacityInVertices / 3);
		var segsLimit = Math.floor(this.bufferCapacityInVertices / 2);
		// console.log("rendering "+len+" marker polygons");
		
		var is_typhoon = (this.shaderType === GLMobLayer.ShaderType.Typhoon);
		var texWidth = this.markerTextureConf.originalWidth;
		var texHeight = this.markerTextureConf.originalHeight;
		var u_width = this.markerTextureConf.chipWidth / texWidth;
		var v_height = this.markerTextureConf.chipHeight / texHeight;
		if (is_typhoon) {
			u_width = 0.5; // Fix u coord
		}

		var tempBounds = this.tempBounds;
		this.calcCurrnetBounds(tempBounds, 16);
		
		var spriteCX, spriteCY, spriteW2, spriteH2;

		if (!is_typhoon)
		{
			spriteCX = 7;
			spriteCY = 7;
			spriteW2 = 32;
			spriteH2 = 32;
		} else {
			spriteCX = 63;
			spriteCY = 63;
			spriteW2 = 256;
			spriteH2 = 256;
		}
		
		var i, mk;

		// [Draw] Tail
		var segCount = 0;
		var segFlushThreshold = (segsLimit >> 1);
		var use_dircolor = this.tailDirectionColorEnabled;
		if (this.enableTailDraw) {
			this.gl.useProgram(this.colorLineShaderObjects.shaderProgram);
			for (i = 0;i < len;++i) {
				mk = m_arr[i];

				// Transform tail points
				if (mk.tailLengthToRender > 0 && mk.tailArray) {
					vi += this.writeTailVertices(vlist, vi, cllist, mk, use_dircolor);
					segCount += mk.tailLengthToRender;
				}
				
				// Buffer is almost full! (or last)
				if (segCount >= segFlushThreshold ||
					i === lastIndex) {
					//console.log("--- ", i, segCount);
					this.nSegmentsBuffered = segCount;
					
					this.drawBufferedLinePrimitives(this.gl);
					segCount = 0;
					vi = 0;
				}
			}
		}

		// [Draw] Marker
		var minSX = -16;
		var minSY = -16;
		var maxSX = this.canvasSize.w + 16;
		var maxSY = this.canvasSize.h + 16;
		
		var nMarkerDrawn = 0;
		this.gl.useProgram(this.shaderProgram);
		vi = 0;
		for (i = 0;i < len;++i) {
			mk = m_arr[i];
			if (mk.chipY >= 0) {
				this.projectionGrid.calc(mk);

				var sx = mk.screenX;
				var sy = mk.screenY;
				if (sx >= minSX && sy >= minSY && sx <= maxSX && sy <= maxSY) {
					mk.renderingID = gNextRenderingID;
					var cx = 7;
					var cy = 7;

					// Append positions
					var sx0 = sx - spriteCX;
					var sy0 = sy - spriteCY;
					vlist[vi  ] = sx0           ;  vlist[vi+1] = sy0           ;
					vlist[vi+2] = sx0 + spriteW2;  vlist[vi+3] = sy0           ;
					vlist[vi+4] = sx0           ;  vlist[vi+5] = sy0 + spriteH2;
					vi += 6;
			
					// Append texture coordinates (fixed + variable = final UV)
		//			txi += this.setMarkerTextureCoords(txlist, txi, 0.0, 0.0, 0.5, 0.5);

					//   Fixed UV
					txi += this.setMarkerTextureCoords(txlist, txi, 0.0, 0.0, u_width * 2.0, 1.0);

					//   Variable UV
					bi += this.setMarkerTextureCoords(tblist, bi, mk.chipX / texWidth, mk.chipY / texHeight, 0.0, 0.0);

					++triCount;
					++nMarkerDrawn;
				}
			}

			if (
				triCount >= trisLimit || // buffer is full
				i === lastIndex // flush at last loop
				) {
				
				this.nTrianglesBuffered = triCount;
				this.drawBufferedPrimitives(this.gl);
				
				vi = txi = bi = triCount = 0;
			}
		}

		//console.log("drawn markers", nMarkerDrawn);
		// [Draw] Labels
		
		var nLabelLimit = 100;
		var labelRenderer = this.ensureLabelRenderer();
		var labCapacity = labelRenderer.calcLabelCapacity();
		
		if (this.enableLabel && nMarkerDrawn < nLabelLimit) {
			// Clear label buffer
			labelsTempBuffer.length = 0;
			labelsOwnerTempBuffer.length = 0;
			
			var labelSpriteWidth  = labelRenderer.getLabelSpriteWidth();
			var labelSpriteHeight = labelRenderer.getLabelSpriteHeight();
			
			for (i = 0;i < len;++i) {
				mk = m_arr[i];
				if (mk.renderingID === gNextRenderingID) {
					// Fill label texts
					labelsTempBuffer.push(mk.labelText);
					labelsOwnerTempBuffer.push(mk);
				}
				
				if (labelsTempBuffer.length >= labCapacity || i === (len-1)) {
					//console.log("Will Render:\n", labelsTempBuffer.join('\n'));
					var nRenderableLabels = labelRenderer.renewWithTextList(labelsTempBuffer);
					
					this.renderBufferedLabels(labelsTempBuffer, labelsOwnerTempBuffer, labelSpriteWidth, labelSpriteHeight);
					labelsTempBuffer.length = 0;
					labelsOwnerTempBuffer.length = 0;
				}
			}
		}

	};
	
	GLMobLayer.prototype.renderBufferedLabels = function(labelTextArray, labelOwnerArray, labelSpriteWidth, labelSpriteHeight) {
		var vlist = this.glBuffers.arrPositions;
		var txlist = this.glBuffers.arrTexcoords;
		var vpos = 0;

		var len = labelOwnerArray.length;
		for (var i = 0;i < len;++i) {
			var markerData = labelOwnerArray[i];
			
			vpos += this.writeLabelVertexPositions(markerData, vlist, vpos, labelSpriteWidth, labelSpriteHeight);
		}
		
		console.log("Triangles: ",vpos, vlist[0], vlist[1], vlist[2], vlist[3]);
		this.drawLabelPolygons();
	};

	GLMobLayer.prototype.writeLabelVertexPositions = function(markerData, vlist, startPos, labelSpriteWidth, labelSpriteHeight) {
		var i = 0;

		var sx = markerData.screenX + 7;
		var sy = markerData.screenY - 5;
		
		// T1, p0
		vlist[startPos + (i++) ] = sx;
		vlist[startPos + (i++) ] = sy;
		
		// T1, p1
		vlist[startPos + (i++) ] = sx + labelSpriteWidth;
		vlist[startPos + (i++) ] = sy;

		// T1, p2
		vlist[startPos + (i++) ] = sx + labelSpriteWidth;
		vlist[startPos + (i++) ] = sy + labelSpriteHeight;
		
		
		// T2, p0
		vlist[startPos + (i++) ] = sx;
		vlist[startPos + (i++) ] = sy + labelSpriteHeight;

		// T2, p1
		vlist[startPos + (i++) ] = sx;
		vlist[startPos + (i++) ] = sy;

		// T2, p2
		vlist[startPos + (i++) ] = sx + labelSpriteWidth;
		vlist[startPos + (i++) ] = sy + labelSpriteHeight;

		return i;
	};

	GLMobLayer.prototype.drawLabelPolygons = function() {
		// Write to buffer
		this.updateBufferContent();

//		var S = this.colorLineShaderObjects;

		/*
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbPositions);
		gl.enableVertexAttribArray(S.shaderParams.vertexPosition);
		gl.vertexAttribPointer(
			S.shaderParams.vertexPosition,
			this.vertexDimension, // components per vertex
			gl.FLOAT, false, 0, 0);
*/
	};

	GLMobLayer.prototype.writeTailVertices = function(vlist, startIndex, cllist, markerData, dirColor) {
		var color_func = GLMobLayer.calcDirectionColor;
		
		var vi = startIndex;
		var cIndex = (startIndex << 1);
		var tailArray = markerData.tailArray;
		this.projectionGrid.calc(markerData);
		
		var prevX = markerData.screenX;
		var prevY = markerData.screenY;
		var prevC = markerData.baseColor;
		var prevAlpha = (markerData.tailAlpha * 255) | 0;

		var pcR, pcG, pcB;

		var taillen = markerData.tailLengthToRender;
		for (var ti = 0;ti < taillen;++ti) {
			var t_mk = tailArray[ti];
			this.projectionGrid.calc(t_mk);

			vlist[vi++] = prevX;
			vlist[vi++] = prevY;
			
			if (dirColor) {
				var dx = prevX - t_mk.screenX;
				var dy = prevY - t_mk.screenY;
				var generated_color = color_func(dx, dy);
				pcR = generated_color[0];
				pcG = generated_color[1];
				pcB = generated_color[2];
			} else {
				pcR = prevC.r;
				pcG = prevC.g;
				pcB = prevC.b;
			}

			cllist[cIndex++] = pcR;
			cllist[cIndex++] = pcG;
			cllist[cIndex++] = pcB;
			cllist[cIndex++] = prevAlpha;

			prevC = t_mk.baseColor;
			prevAlpha = (t_mk.tailAlpha * 255) | 0;
			vlist[vi++] = prevX = t_mk.screenX;
			vlist[vi++] = prevY = t_mk.screenY;
			
			if (!dirColor) {
				pcR = prevC.r;
				pcG = prevC.g;
				pcB = prevC.b;
			}

			cllist[cIndex++] = pcR;
			cllist[cIndex++] = pcG;
			cllist[cIndex++] = pcB;
			cllist[cIndex++] = prevAlpha;
		}
		
		return vi - startIndex;
	};

	GLMobLayer.calcDirectionColor = (function(){
		var temp_components = [0,0,0];
		
		return function(dx, dy) {
			var h = 1.25 + Math.atan2(dy, dx) / (Math.PI*2.0);
			
			temp_components[0] = 360 - (Math.floor(h * 360) % 360);
			temp_components[1] = 0.9;
			temp_components[2] = 0.8;

			hsvToRGB(temp_components);
			return temp_components;
		} ;
	})();

	GLMobLayer.prototype.advanceTyphoonAnimation = function(gl) {
		if (!this.showTyphoonCloud) {
			gl.uniform1f(this.shaderParams.animationT, -99.0);
			this.timeDirection = 0;
			return;
		}

		var params = this.shaderParams;
		var curTime = (new Date()) - 0;
		var dt = curTime - params.taPrevTime;
		if (dt >= 1000) {
			// Don't animate
		} else {
			if (dt < 2) {dt = 2;}
			if (this.timeDirection > 0) {
				params.taCurrentAngle += dt >> 1;
			} else if (this.timeDirection < 0) {
				params.taCurrentAngle -= dt >> 1;
			}
			
			if (params.taCurrentAngle >= 1000) { params.taCurrentAngle -= 1000; }
			else if (params.taCurrentAngle < 0) { params.taCurrentAngle += 1000; }
		}
		
		params.taPrevTime = curTime;
		gl.uniform1f(this.shaderParams.animationT, params.taCurrentAngle / 1000.0);
		this.timeDirection = 0;
	};

	GLMobLayer.prototype.drawBufferedLinePrimitives = function(gl) {
		if (this.nSegmentsBuffered < 1) {
			return;
		}
		
		// Write to buffer
		this.updateLineBufferContent();

		var S = this.colorLineShaderObjects;
		// Setup buffer objects -----------------------
		//  position buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbPositions);
		gl.enableVertexAttribArray(S.shaderParams.vertexPosition);
		gl.vertexAttribPointer(
			S.shaderParams.vertexPosition,
			this.vertexDimension, // components per vertex
			gl.FLOAT, false, 0, 0);

		//  color buffer
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbColors);
		gl.enableVertexAttribArray(S.shaderParams.vertexColor);
		gl.vertexAttribPointer(
			S.shaderParams.vertexColor,
			4, // components per vertex
			gl.UNSIGNED_BYTE, false, 0, 0);

//console.log(S.shaderParams.vertexColor, S.shaderParams.vertexPosition);

		// Run -----------------------
		gl.drawArrays(gl.LINES, 0, this.nSegmentsBuffered * 2);
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

		if (this.canvasOffset) {
			grid.setOffset(-this.canvasOffset.x, -this.canvasOffset.y);
		}

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

	GLMobLayer.prototype.updateLineBufferContent = function() {
		var gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbPositions);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.glBuffers.arrPositions);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbColors);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.glBuffers.arrColors);
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

		gl.bindBuffer(gl.ARRAY_BUFFER, this.glBuffers.vbColors);
		gl.bufferData(gl.ARRAY_BUFFER, this.glBuffers.arrColors, gl.DYNAMIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	};
	
	GLMobLayer.prototype.setMarkerImage = function(img, crop) {
		var texconf = this.markerTextureConf;
		
		if (!this.gl) { return false; }
		if (!!img.src && texconf.sourceImage === img) { return false; }
		this.destroyMarkerTexture();

		texconf.sourceImage    = img;
		texconf.originalWidth  = img.width - 0;
		texconf.originalHeight = img.height - 0;

		texconf.enableCrop = (crop === false) ? false : true;

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
		
		if (this.shaderType === GLMobLayer.ShaderType.Typhoon) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		}
		
		return tex;
	};
	
	GLMobLayer.prototype.destroyMarkerTexture = function() {
		if (this.markerTexture) {
			this.gl.deleteTexture(this.markerTexture);
			this.markerTexture = null;
		}
	};
	
	GLMobLayer.prototype.ensureLabelRenderer = function() {
		if (!this.labelRenderer) {
			this.labelRenderer = new mobmap.LabelTextureRenderer(this.gl);
		}
		
		return this.labelRenderer;
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
		gl.bufferData(gl.ARRAY_BUFFER, sourceArray, gl.STREAM_DRAW);
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
		this.screenX = this.screenY  = this.lat = this.lng = 0;
		this.chipX = 0;
		this.chipY = 0;
		this.baseColor = null;

		this.tailAlpha = 1;
		this.tailArray = null;
		this.tailLengthToRender = 0;
		
		this.renderingID = 0;
		this.labelText = null;
	}
	
	MarkerDisplayData.prototype.ensureTailArray = function(length) {
		if (length < 1) { return; }
		var i;
		
		if (!this.tailArray) {
			this.tailArray = new Array(length);
			for (i = 0;i < length;++i) {
				this.tailArray[i] = new MarkerDisplayData();
			}
		} else {
			var arr = this.tailArray;
			var oldLen = arr.length;
			if (oldLen >= length) {
				return arr;
			} else {
				arr.length = length;
				for (i = oldLen;i < length;++i) {
					arr[i] = new MarkerDisplayData();
				}
			}
		}
		
		return this.tailArray;
	};
	
	function MarkerTextureConfiguration() {
		this.sourceImage    = null;
		this.originalWidth  = 1;
		this.originalHeight = 1;
		this.chipWidth      = 16;
		this.chipHeight     = 16;
		this.enableCrop     = true;
	}

	// Shaders ---------------------------------------------
	var FillTestVertexShader = [
		"attribute vec2 aVertexPosition;",
		"attribute vec2 aTextureCoord;",
		"attribute vec2 aTextureBase;",
		"varying vec2 vTextureCoord;",
		"varying vec2 vTextureBase;",
		"varying vec2 vTextureMovedCoord;",
		"uniform mat4 transform;",
		"void main(void) {",
		" vTextureCoord = aTextureCoord;",
		" vTextureBase  = aTextureBase;",
		" vTextureMovedCoord = aTextureBase + aTextureCoord;",
		" gl_Position = transform * vec4(aVertexPosition, 0.0, 1.0);",
		"}"
	].join("\n");

	var FillTestFragmentShader = [
		"precision mediump float;",
		"uniform sampler2D texture;",
		"uniform vec4 validUV;",
		"varying vec2 vTextureCoord;",
		"varying vec2 vTextureBase;",
		"varying vec2 vTextureMovedCoord;",
		"void main(void) {",
//		" if(vTextureCoord.x < 0.06 || vTextureCoord.y < 0.06 || vTextureCoord.x > 0.19 || vTextureCoord.y > 0.19) {discard;}",
//		" if(vTextureCoord.x < 0.06 || vTextureCoord.y < 0.12 || vTextureCoord.x > 0.19 || vTextureCoord.y > 0.38) {discard;}",

		// rgba -> u1,v1,u2,v2
		" if(vTextureCoord.x < validUV.r || vTextureCoord.y < validUV.g || vTextureCoord.x > validUV.b || vTextureCoord.y > validUV.a) { discard; }",
//		" if(vTextureCoord.x < validUV.r || vTextureCoord.y < 0.12 || vTextureCoord.x > validUV.b || vTextureCoord.y > 0.38) { discard; }",

		" gl_FragColor = texture2D(texture, vTextureMovedCoord);",
//		" if (texel.z < 0.001) {discard;} ",
//		" gl_FragColor  = texel;",
		"}"
	].join("\n");

	var TyphoonFragmentShader = [
		"precision mediump float;",
		"uniform sampler2D texture;",
		"uniform float animationT;",
		"varying vec2 vTextureCoord;",
		"varying vec2 vTextureBase;",
		"void main(void) {",
		" if (vTextureCoord.x > 0.5 || vTextureCoord.y > 0.5) {discard;} ",
		" vec2 uv = vTextureCoord * 4.0 - vec2(1.0, 1.0);",
		" float radius = length(uv);",
		" float diag1 = abs( uv.x - uv.y);",
		" float diag2 = abs(-uv.x - uv.y);",
		" if (radius > 1.0) {discard;} ",
		" if (radius > 0.075 && animationT < -98.0) {discard;} ",
		" float angle = atan(uv.y, uv.x); ",
		" float pi = 3.141592658979; ",
		" vec2 c_uv = vec2( (angle/pi)*0.5 + 0.5 - radius*0.2 + animationT, radius*0.5 + animationT); ",
		" vec4 texel = texture2D(texture, c_uv);",
		" float alpha = texel.r*1.8 * (1.0 - radius - sin(radius*6.0+0.5-angle)*0.2);",
		" float diag_min = min(diag1, diag2) * 30.0;",
		" if (alpha < 0.5) { alpha *= 0.5; } ",
		" if (radius < 0.075) { gl_FragColor = vec4(1,diag_min,diag_min,1); }",
		" else { gl_FragColor  = vec4(texel.rgb*alpha, alpha); }",
		"}"
	].join("\n");

	var ColorLineVertexShader = [
		"attribute vec2 aVertexPosition;",
		"attribute vec4 aColor;",
		"varying vec4 vColor;",
		"uniform mat4 transform;",
		"void main(void) {",
		" vColor = aColor / 255.0;",
		" gl_Position = transform * vec4(aVertexPosition, 0.0, 1.0);",
		"}"
	].join("\n");

	var ColorLineFragmentShader = [
		"precision mediump float;",
		"uniform sampler2D texture;",
		"varying vec4 vColor;",
		"void main(void) {",
		" gl_FragColor = vColor;",
		"}"
	].join("\n");


	var CloudImageDataURI = 'data:image/png;base64,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';
		
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