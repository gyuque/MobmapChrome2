(function() {
	'use strict';
	var theController = null;
	var kMainScreenCanvasId = 'main-screen-cv';
	
	// Initialize
	window.onload = function() {
		checkInitialData();
	};
	
	function checkInitialData() {
		if (!window.mobmapInitData) {
			setTimeout(checkInitialData, 200);
		} else {
			afterInitialDataOK(window.mobmapInitData);
		}
	}
	
	function afterInitialDataOK(init_data) {
		theController = new ThreeDViewController(kMainScreenCanvasId, init_data);
		window.receive3DViewTargetData = theController.receive3DViewTargetData.bind(theController);
	}
	
	// Global APIs
	
	// Main Controller - - - - - - - - - - - - -
	function ThreeDViewController(screenCvId, init_data) {
		this.dragState = {
			active: false,
			prevPt: {x:0,y:0}
		};
		
		this.gl = null;
		this.viewDirty = true;
		this.normalShader = null;
		this.baseMapPanel = null;
		this.mapTexture = null;
		this.matView = mat4.create();
		this.matProj = mat4.create();
		this.canvasSize = {
			width: 320,
			height: 240
		};
		
		this.viewState = {
			rotY: 0
		};
		
		this.screenCanvas = document.getElementById(screenCvId);
		this.jScreenCanvas = $(this.screenCanvas);
		
		this.targetLayerId = init_data.layerId;
		this.mapViewport = init_data.mapViewport;
		this.imgStaticMap = null;
		
		this.downloadStaticMap( this.afterMapDownloaded.bind(this) , this.mapViewport);
		this.content = null;
	}
	
	ThreeDViewController.prototype = {
		downloadStaticMap: function(callback, mapViewport) {
			console.log(mapViewport)
			var tileSize = 512;
			var mapCt = mapViewport.center;
			var src = ThreeDViewController.generateStaticMapURL(mapCt.lat, mapCt.lng, tileSize, mapViewport.zoom);

			var xhr = new XMLHttpRequest();
			xhr.open('GET', src, true);
			xhr.responseType = 'blob';
			xhr.onload = function(e) {
				var img = document.createElement('img');
				img.onload = function() {
					callback(img);
				};
				img.src = window.URL.createObjectURL(this.response);
			};
			
			xhr.send();
		},
		
		afterMapDownloaded: function(loadedImage) {
			//console.log("OK");
			//document.body.appendChild(loadedImage);
			this.initializeCanvas();
			this.baseMapPanel = new ThreeDViewMapPanel(this.gl);
			this.normalShader = new NormalShader(this.gl, 'vs-src', 'fs-src');
			this.colorShader  = new ColorShader(this.gl, 'color-vs-src', 'color-fs-src');
			this.mapTexture = this.initializeMapTexture(loadedImage);
			var resizeFunc = this.observeResize();
			this.observeUserInput();
			
			resizeFunc();
			
			window.sendRequest3DViewTargetData(this.targetLayerId);
		},
		
		receive3DViewTargetData: function(params) {
			if (params.layerId === this.targetLayerId) {
				this.newTrajectoryContent(params.content);
			}
		},
		
		newTrajectoryContent: function(contentSource) {
			this.content = new ThreeDViewTrajectoryContent(this.gl, contentSource);

			this.viewDirty = true;
			this.render();
		},
		
		initializeCanvas: function() {
			this.gl = this.screenCanvas.getContext("webgl");
			if (!this.gl) {
				console.log("WARNING: Failed to create GL context");
			}
		},

		initializeMapTexture: function(sourceImage) {
			return ThreeDViewController.createTextureObject(this.gl, sourceImage);
		},

		calcAspect: function() {
			return this.canvasSize.width / this.canvasSize.height;
		},
		
		observeUserInput: function() {
			var j = $('html');
			
			j.
			 mousedown(this.onMouseDown.bind(this)).
			 mousemove(this.onMouseMove.bind(this)).
			 mouseup(this.onMouseUp.bind(this));
		},
		
		observeResize: function() {
			var wnd = $(window);
			var closure = this.onResize.bind(this, wnd);
			wnd.resize(closure);
			
			return closure;
		},
		
		onResize: function(jWindow) {
			var w = jWindow.width();
			var h = jWindow.height();
			
			this.canvasSize.width = w;
			this.canvasSize.height = h;
			this.afterCanvasResized();
		},
		
		afterCanvasResized: function() {
			var cv = this.screenCanvas;
			var gl = this.gl;
			if (!cv || !gl) { return; }
			
			cv.width = this.canvasSize.width;
			cv.height = this.canvasSize.height;
			gl.viewport(0, 0, this.canvasSize.width, this.canvasSize.height);
			
			this.initializeProjectionMatrix();
			this.viewDirty = true;
			this.render();
		},
		
		clearView: function() {
			var gl = this.gl;
			gl.clearColor(0.3, 0.3, 0.3, 1.0);
			gl.clearDepth(1.0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		},
		
		render: function() {
			if (!this.viewDirty) {
				return;
			}

			this.viewDirty = false;
			var gl = this.gl
			this.normalShader.use(gl);
			this.updateViewMatrix(this.normalShader);
			this.clearView();
			
			// Use texture
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.mapTexture);
			gl.uniform1i(this.normalShader.params.uTexture, 0);
			
			if (this.baseMapPanel) {
				this.baseMapPanel.prepareShaderData(this.normalShader.params);
			}
			
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			
			if (this.content) {
				this.content.render(this);
			}
			
			gl.flush();
		},
		
		initializeProjectionMatrix: function() {
			var m = this.matProj;

			mat4.perspective(m, Math.PI * 0.3, this.calcAspect(), 0.1, 20.0);
			this.normalShader.use(this.gl);
			this.normalShader.setProjectionMatrixUniformValue(this.gl, m);
			
			this.colorShader.use(this.gl);
			this.colorShader.setProjectionMatrixUniformValue(this.gl, m);
		},
		
		updateViewMatrix: function(targetShader) {
			var m = this.matView;

			var eyePos = _tempVecEyePos;
			this.calcEyePos(eyePos);

			mat4.identity(m);
			mat4.lookAt(m, eyePos, [0, 0, 0], [0,1,0]); 
			
			targetShader.setViewMatrixUniformValue(this.gl, m);
		},
		
		calcEyePos: function(outVec) {
			var a = this.viewState.rotY;
			var x = Math.sin(a);
			var z = Math.cos(a);
			
			outVec[0] = x * 1.5;
			outVec[1] = 1.0;
			outVec[2] = z * 1.5;
		},
		
		
		onMouseDown: function(e) {
			var mx = e.clientX;
			var my = e.clientY;
			
			// Update state
			var ds = this.dragState;
			ds.active = true;
			ds.prevPt.x = mx;
			ds.prevPt.y = my;
		},
		
		onMouseMove: function(e) {
			var mx = e.clientX;
			var my = e.clientY;
			
			// Update state
			var ds = this.dragState;
			if (ds.active) {
				var dx = mx - ds.prevPt.x;
				var dy = my - ds.prevPt.y;

				this.onDrag(dx, dy);

				ds.prevPt.x = mx;
				ds.prevPt.y = my;
			}
		},

		onMouseUp: function(e) {
			var ds = this.dragState;
			ds.active = false;
		},
		
		onDrag: function(dx, dy) {
			var DPI = Math.PI * 2.0;
			this.viewState.rotY += dx * -0.01;
			if (this.viewState.rotY > DPI) { this.viewState.rotY -= DPI; }
			else if (this.viewState.rotY < 0) { this.viewState.rotY += DPI; }
			this.viewDirty = true;
			
			this.render();
		}
	};
	
	ThreeDViewController.generateStaticMapURL = function(centerLat, centerLng, tileSize, zoom) {
		var sizeString = tileSize +'x'+ tileSize;
		var centerString = centerLat +',' + centerLng;

		var base = "http://maps.googleapis.com/maps/api/staticmap?center=" +centerString+ "&zoom=" +zoom+ "&size=" +sizeString+ "&maptype=roadmap&sensor=false";
		
		ThreeDViewController.generateStaticMapViewport(centerLat, centerLng, tileSize, zoom);
		return base;
	};
	
	ThreeDViewController.generateStaticMapViewport = function(centerLat, centerLng, tileSize, zoom) {
		var DEG2RAD = Math.PI / 180.0;
		var xy = mobmap.GoogleMapsCalc.LatLngToXY(centerLat * DEG2RAD , centerLng * DEG2RAD);
		var worldSize = mobmap.GoogleMapsCalc.calcWorldMapSize(zoom);
		var halfSize = tileSize / 2;
		var span = halfSize / worldSize;
		
		var northWest = mobmap.GoogleMapsCalc.XYtoLatLng(xy[0] - span, xy[1] - span);
		northWest[0] /= DEG2RAD;
		northWest[1] /= DEG2RAD;

		var southEast = mobmap.GoogleMapsCalc.XYtoLatLng(xy[0] + span, xy[1] + span);
		southEast[0] /= DEG2RAD;
		southEast[1] /= DEG2RAD;

		console.log(southEast);
		return {
			southLat: southEast[0],
			eastLng: southEast[1]
		};
	};
	
	ThreeDViewController.createTextureObject = function(gl, sourceImage) {
		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImage);
		gl.generateMipmap(gl.TEXTURE_2D);
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		
		return tex;
	};


	function NormalShader(gl, vs_src_id, fs_src_id) {
		shader_obj_init(this, gl, vs_src_id, fs_src_id);
	}

	NormalShader.fetchShaderSource = function(element_id) {
		var el = document.getElementById(element_id);
		return el.innerHTML;
	};

	function shader_obj_init(that, gl, vs_src_id, fs_src_id) {
		that.program = null;
		that.params = {};
		var vsSource = NormalShader.fetchShaderSource(vs_src_id);
		var fsSource = NormalShader.fetchShaderSource(fs_src_id);
		
		that.setupShader(gl, vsSource, fsSource, that.params);
	}

	NormalShader.prototype = {
		use: function(gl) {
			gl.useProgram(this.program);
		},
		
		setupShader: function(gl, vsSource, fsSource, outParams) {
			// VS ============================================
			var vs = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vs, vsSource);
			gl.compileShader(vs);

			if(!gl.getShaderParameter(vs, gl.COMPILE_STATUS)){
				console.log(gl.getShaderInfoLog(vs));
				return false;
			}

			// FS ============================================
			var fs = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fs, fsSource);
			gl.compileShader(fs);

			if(!gl.getShaderParameter(fs, gl.COMPILE_STATUS)){
				console.log(gl.getShaderInfoLog(fs));
				return false;
			}

			// Link
			var program = gl.createProgram();
			gl.attachShader(program, fs);
			gl.attachShader(program, vs);
			gl.linkProgram(program);
			if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
				console.log(gl.getProgramInfoLog(program));
				return false;
			}

			// Pick params
			gl.useProgram(program);
			this.pickShaderParams(gl, outParams, program);

			this.program = program;
			return true;
		},
		
		pickShaderParams: function(gl, outParams, program) {
			outParams.aPosition = gl.getAttribLocation(program, 'aPosition');
			outParams.aColor    = gl.getAttribLocation(program, 'aColor');
			outParams.aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
			outParams.uTexture       = gl.getUniformLocation(program, 'uTexture');
			outParams.uViewTransform = gl.getUniformLocation(program, 'uViewTransform');
			outParams.uProjTransform = gl.getUniformLocation(program, 'uProjTransform');
		},
		
		setViewMatrixUniformValue: function(gl, m) {
			var uloc = this.params.uViewTransform;
			gl.uniformMatrix4fv(uloc, false, m);
		},
		
		setProjectionMatrixUniformValue: function(gl, m) {
			var uloc = this.params.uProjTransform;
			gl.uniformMatrix4fv(uloc, false, m);
		}
	};


	function ColorShader(gl, vs_src_id, fs_src_id) {
		shader_obj_init(this, gl, vs_src_id, fs_src_id);
	}
	
	ColorShader.prototype.use = NormalShader.prototype.use;
	ColorShader.prototype.setupShader = NormalShader.prototype.setupShader;
	ColorShader.prototype.setProjectionMatrixUniformValue = NormalShader.prototype.setProjectionMatrixUniformValue;
	ColorShader.prototype.setViewMatrixUniformValue = NormalShader.prototype.setViewMatrixUniformValue;
	ColorShader.prototype.pickShaderParams = function(gl, outParams, program) {
		outParams.aPosition = gl.getAttribLocation(program, 'aPosition');
		outParams.aColor    = gl.getAttribLocation(program, 'aColor');
		outParams.uViewTransform = gl.getUniformLocation(program, 'uViewTransform');
		outParams.uProjTransform = gl.getUniformLocation(program, 'uProjTransform');
	};


	function ThreeDViewTrajectoryContent(gl, contentSource) {
		this.vbPoss = null;
		this.possSrcArray = null;

		this.recordListArray = contentSource.record_list_array;
		console.log('*',this.recordListArray)
	}
	
	ThreeDViewTrajectoryContent.prototype = {
		render: function(controller) {
			var gl = controller.gl;
			var shader = controller.colorShader;
			shader.use(gl);
			controller.updateViewMatrix(shader);
			
			var nObjects = this.recordListArray.length;
			for (var i = 0;i < nObjects;++i) {
				this.renderRecordList(this.recordListArray[i].recordList);
			}
		},
		
		renderRecordList: function(recordList) {
			console.log(recordList)
		},
		
		generateVertexBuffer: function(gl) {
			
		}
	};


	var _tempVecEyePos = [0,0,0];
})();