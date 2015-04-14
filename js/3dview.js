(function() {
	'use strict';
	var theController = null;
	var kMainScreenCanvasId = 'main-screen-cv';
	var kBlackTextureData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3wIJDgwsvIcWVQAAA'+
	 'B1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAFklEQVQY02NkYGBYx4AHMDEQAMNDAQC6AAC+3iBukwAAAABJRU5ErkJggg==';
	var gBlackTextureImage = null;
	
	// Initialize
	window.onload = function() {
		gBlackTextureImage = new Image();
		gBlackTextureImage.onload = checkInitialData;
		
		gBlackTextureImage.src = kBlackTextureData;
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
		window.receiveProjectionGridConfiguration = theController.receiveProjectionGridConfiguration.bind(theController);
		window.receiveCurrentTime = theController.receiveCurrentTime.bind(theController);
		window.receiveSelectionChange = theController.receiveSelectionChange.bind(theController);
		window.receiveMarkerOptionsChange = theController.receiveMarkerOptionsChange.bind(theController);
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
		this.contentUIContainerElement = null;
		this.projectionGird = new mobmap.FastProjectionGrid(2);
		this.normalShader = null;
		this.baseMapPanel = null;
		this.mapTexture = null;
		this.panelBaseTexture = null;
		this.matView = mat4.create();
		this.matProj = mat4.create();
		this.currentInSeconds = 0;
		this.canvasSize = {
			width: 320,
			height: 240
		};
		
		this.viewState = {
			rotY: 0,
			eyePosY: 1.0,
			distance: 1.5
		};
		
		this.screenCanvas = document.getElementById(screenCvId);
		this.jScreenCanvas = $(this.screenCanvas);
		
		this.targetLayerId = init_data.layerId;
		this.mapViewport = init_data.mapViewport;
		this.mapTextureViewport = null;
		this.imgStaticMap = null;
		
		this.downloadStaticMap( this.afterMapDownloaded.bind(this) , this.mapViewport);
		this.content = null;
		
		this.timescaleInputElement = null;
	}
	
	ThreeDViewController.prototype = {
		downloadStaticMap: function(callback, mapViewport) {
			console.log(mapViewport)
			var tileSize = 512;
			var mapCt = mapViewport.center;
			var src = ThreeDViewController.generateStaticMapURL(mapCt.lat, mapCt.lng, tileSize, mapViewport.zoom);
			this.mapTextureViewport = ThreeDViewController.generateStaticMapViewport(mapCt.lat, mapCt.lng, tileSize, mapViewport.zoom);
			

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
			this.annPointShader = new ColorShader(this.gl, 'color-vs-apoint', 'color-fs-apoint');
			this.mapTexture = this.initializeMapTexture(loadedImage);
			this.panelBaseTexture = this.initializePanelBaseTexture();
			var resizeFunc = this.observeResize();
			this.observeUserInput();
			
			resizeFunc();
			
			window.sendRequestProjectionData(this.targetLayerId, this.mapTextureViewport);
			window.sendRequest3DViewTargetData(this.targetLayerId);
			
			this.putTimeScaleSlider();
			this.initializeContentUIArea('content-ui-area');
		},
		
		putTimeScaleSlider: function() {
			var containerElement = document.body;
			
			var outer = document.createElement('label');
			outer.innerHTML = "Time scale";
			
			var st = outer.style;
			st.position = 'absolute';
			st.bottom = "4px";
			st.right = "4px";
			
			var range = document.createElement('input');
			range.type = 'range';
			range.style.width = '60px';
			range.setAttribute('min', 0);
			range.setAttribute('max', 59);
			range.value = 20;
			
			outer.appendChild(document.createElement('br'));
			outer.appendChild(range);
			containerElement.appendChild(outer);
			
			range.addEventListener('mousedown', this.ignoreHandler, false);
			range.addEventListener('mouseup', this.ignoreHandler, false);
			
			range.addEventListener('change'   , this.onTimeScaleInputChange.bind(this, range), false);
			range.addEventListener('mousemove', this.onTimeScaleInputChange.bind(this, range), false);
			
			this.timescaleInputElement = range;
		},
		
		ignoreHandler: function(e) {
			e.stopPropagation();
		},
		
		onTimeScaleInputChange: function(rangeElement) {
			this.setTimeScaleByPresetIndex(rangeElement.value - 0);
		},
		
		setTimeScaleByPresetIndex: function(val) {
			var n = 60;
			if (val < 0) { val = 0; }
			else if (val >= n) { val = n-1; }
			
			var presetValue = Math.pow(2, (val/10) - 3);
			if (this.content && this.content.scaleTimeYScale) {
				if (this.content.scaleTimeYScale(presetValue)) {
					this.viewDirty = true;
					this.render();
				}
			}
		},
		
		receive3DViewTargetData: function(params) {
			this.receiveCurrentTime(params.time);
			
			if (params.layerId === this.targetLayerId && params.content) {
				this.newTrajectoryContent(params.content);
			}
		},

		receiveProjectionGridConfiguration: function(params) {
			if (this.mapTextureViewport) {
				if (this.isViewportSame(this.mapTextureViewport, params.originalViewport)) {
					this.projectionGird.importConfiguration(params.gridConfiguration);
					this.projectionGird.relocateOrigin();
				}
			}
			
			this.viewDirty = true;
			this.render();
		},
		
		afterAnnotationChange: function() {
			this.viewDirty = true;
			this.render();
		},

		receiveCurrentTime: function(newTime) {
			this.currentInSeconds = newTime;

			this.viewDirty = true;
			this.render();
		},
		
		receiveSelectionChange: function(senderLayerId) {
			if (this.targetLayerId === senderLayerId) {
				window.sendRequest3DViewTargetData(this.targetLayerId);
			}
		},
		
		receiveMarkerOptionsChange: function(senderLayerId, coloringInfo) {
			
			if (coloringInfo && this.targetLayerId === senderLayerId && this.content) {
				
				if (this.content.setColoringInfo) {
					this.content.setColoringInfo(coloringInfo);

					this.viewDirty = true;
					this.render();
				}
				
			}
		},
		
		isViewportSame: function(v1, v2) {
			function is_near(a,b) { return Math.abs(a-b) < 0.00001; }
			
			return (
				 is_near(v1.eastLng , v2.eastLng) &&
				 is_near(v1.westLng , v2.westLng) &&
				 is_near(v1.northLat, v2.northLat) &&
				 is_near(v1.southLat, v2.southLat)
			);
		},

		newTrajectoryContent: function(contentSource) {
			if (!contentSource.record_list_array) {
				this.content = null;
			} else {
				this.content = new ThreeDViewTrajectoryContent(this.gl, contentSource);
			}
			
			if (this.content) {
				this.onTimeScaleInputChange(this.timescaleInputElement);
			}

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

		initializePanelBaseTexture: function() {
			return ThreeDViewController.createTextureObject(this.gl, gBlackTextureImage);
		},

		calcAspect: function() {
			return this.canvasSize.width / this.canvasSize.height;
		},
		
		observeUserInput: function() {
			var j = $('html');
			
			j.
			 keydown(this.onKeyDown.bind(this)).
			 mousedown(this.onMouseDown.bind(this)).
			 mousemove(this.onMouseMove.bind(this)).
			 mouseup(this.onMouseUp.bind(this)).
			 dblclick(this.onDoubleClick.bind(this));
			
			j[0].addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
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

		onMouseWheel: function(e) {
			var d = e.wheelDelta;
			this.viewState.distance -= d * 0.001;
			
			if (this.viewState.distance > 4.0) { this.viewState.distance = 4.0; }
			if (this.viewState.distance < 0.5) { this.viewState.distance = 0.5; }

			this.viewDirty = true;
			this.render();
		},
		
		onDoubleClick: function(e) {
			var jContainer = $('html');
			var w = jContainer.width();
			var h = jContainer.height();
			
			var nx = e.clientX / (w * 0.5) - 1.0;
			var ny = 1.0 - e.clientY / (h * 0.5);
			
			if (this.content && this.content.pickByScreenCoordinate) {
				this.content.pickByScreenCoordinate(this, nx, ny);
			}
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
			gl.clearColor(0.1, 0.1, 0.1, 1.0);
			gl.clearDepth(1.0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		},
		
		render: function() {
			if (!this.viewDirty) {
				return;
			}

			this.viewDirty = false;
			var gl = this.gl
			gl.depthMask(true);
			this.clearView();
			
			gl.enable(gl.BLEND);
			ThreeDViewController.setBlendParams(gl, true);
						
			// Draw content
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.ALWAYS);
			if (this.content) {
				this.content.render(this, this.currentInSeconds);
			}

			// Draw floor panel
			//  Z write -> No
			//  Z test -> Yes
			gl.enable(gl.DEPTH_TEST);
			gl.depthMask(false);
			gl.depthFunc(gl.LESS);
			this.normalShader.use(gl);
			this.updateViewMatrix(this.normalShader);

			//  Use texture
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.mapTexture);
			gl.uniform1i(this.normalShader.params.uTexture, 0);
			
			if (this.baseMapPanel) {
				this.baseMapPanel.prepareShaderData(this.normalShader.params);
			}
			
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

			// Black panel
			ThreeDViewController.setBlendParams(gl, false);
			gl.bindTexture(gl.TEXTURE_2D, this.panelBaseTexture);
			gl.uniform1i(this.normalShader.params.uTexture, 0);

			if (this.baseMapPanel) {
				this.baseMapPanel.prepareShaderData(this.normalShader.params);
			}
			
			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
			gl.disable(gl.DEPTH_TEST);



			gl.flush();
		},
		
		initializeProjectionMatrix: function() {
			var m = this.matProj;

			mat4.perspective(m, Math.PI * 0.3, this.calcAspect(), 0.1, 20.0);
			this.normalShader.use(this.gl);
			this.normalShader.setProjectionMatrixUniformValue(this.gl, m);
			
			this.colorShader.use(this.gl);
			this.colorShader.setProjectionMatrixUniformValue(this.gl, m);
			
			this.annPointShader.use(this.gl);
			this.annPointShader.setProjectionMatrixUniformValue(this.gl, m);
		},
		
		updateViewMatrix: function(targetShader) {
			var m = this.matView;

			var eyePos = _tempVecEyePos;
			this.calcEyePos(eyePos);

			var ty = this.viewState.eyePosY * 0.7 - 0.2;
			mat4.identity(m);
			mat4.lookAt(m, eyePos, [0, ty, 0], [0,1,0]); 
			
			targetShader.setViewMatrixUniformValue(this.gl, m);
		},
		
		calcViewProjMatrix: function(outMat) {
			mat4.mul(outMat, this.matProj, this.matView);
		},
		
		calcEyePos: function(outVec) {
			var a = this.viewState.rotY;
			var x = Math.sin(a);
			var z = Math.cos(a);
			
			outVec[0] = x * this.viewState.distance;
			outVec[1] = this.viewState.eyePosY;
			outVec[2] = z * this.viewState.distance;
		},
		
		
		onKeyDown: function(e) {
			if (this.content && this.content.annotations) {
				if (e.keyCode === 84) {
					this.content.annotations.debug_addTestAnnotation();
					this.afterAnnotationChange();
				} else if (e.keyCode === 89) {
					this.content.annotations.debug_addTestAnnotation2();
					this.afterAnnotationChange();
				}
			}
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
			
			this.moveEyeHeight(dy);
			
			this.viewDirty = true;
			
			this.render();
		},
		
		moveEyeHeight: function(dy) {
			var vs = this.viewState;
			vs.eyePosY += dy * 0.02;
			
			if (vs.eyePosY < 0.2) { vs.eyePosY=0.2; }
			else if (vs.eyePosY > 16.0) { vs.eyePosY=16.0; }
		},
		
		notifyTrajectoryPicked: function(objIndex, objId) {
			if (this.content && this.content.highlightByIndex) {
				if (objIndex === null) {
					this.content.cancelHighlight();
				} else {
					this.content.highlightByIndex(objIndex);
				}

				this.viewDirty = true;
				this.render();
			}
		},

		initializeContentUIArea: function(elem_id) {
			this.contentUIContainerElement = document.getElementById(elem_id);
			this.contentUIContainerElement.innerHTML = '';
			
			$(this.contentUIContainerElement).click( this.onContentAreaClick.bind(this) );
		},
		
		onContentAreaClick: function(e) {
			var el = e.target;
			if (el && el.getAttribute) {
				var cmd = el.getAttribute('data-controller-command');
				if (cmd && cmd.length > 1) {
					this.dispatchContentUICommand(cmd, el);
				}
			}
		},

		clearContentUIArea: function() {
			this.contentUIContainerElement.innerHTML = '';
		},
		
		appendElementOnContentUIArea: function(el) {
			this.contentUIContainerElement.appendChild(el);
		},
		
		dispatchContentUICommand: function(commandName, rawNode) {
			switch(commandName) {
				case 'sel1':
					var param_objid = rawNode.getAttribute('data-target-id');

					if (this.content && this.content.notifyContentCommandWillBeExecuted) {
						this.content.notifyContentCommandWillBeExecuted(this, commandName, param_objid);
					}
				
					if (window.sendSingleSelection) {
						window.sendSingleSelection(this.targetLayerId , param_objid);
					}
					break;
					
				case 'restore-selection':
					var param_idlist = rawNode.getAttribute('data-idlist');
				
					if (this.content && this.content.notifyContentCommandWillBeExecuted) {
						this.content.notifyContentCommandWillBeExecuted(this, commandName, param_idlist);
					}

					if (param_idlist && window.sendSelectionByList) {
						window.sendSelectionByList(this.targetLayerId, param_idlist.split(/ *, */));
					}
					
					break;
			}
		}
	};
	
	ThreeDViewController.generateStaticMapURL = function(centerLat, centerLng, tileSize, zoom) {
		var sizeString = tileSize +'x'+ tileSize;
		var centerString = centerLat +',' + centerLng;

		var style = '&style=feature:all|element:labels|lightness:100&style=feature:landscape|element:geometry|lightness:-100&style=feature:water|element:geometry|lightness:-40';
		var base = "http://maps.googleapis.com/maps/api/staticmap?center=" +centerString+ "&zoom=" +zoom+ "&size=" +sizeString+ "&maptype=roadmap&sensor=false" + style;
		
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
			northLat: northWest[0],
			westLng: northWest[1],
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
		outParams.uPointSize = gl.getUniformLocation(program, 'uPointSize');
	};
	
	ColorShader.prototype.setPointSize = function(gl, s) {
		gl.uniform1f(this.params.uPointSize, s);
	};



	function ThreeDViewTrajectoryContent(gl, contentSource) {
		this.dimension = 3;
		this.vbPoss = null;
		this.vbColors = null;
		this.vbTexCoords = null;
		this.possSrcArray = null;
		this.possSrcArrayShort = null;
		this.colorSrcArray = null;
		this.colorSrcArrayShort = null;
		this.tcSrcArrayShort = null;
		this.startPositionList = [];
		this.pickTempRecord = mobmap.MovingData.createEmptyRecord();
		this.labelTexMan = new ThreeDViewDateLabelTexture(256);
		this.labelTextureObject = null;
		this.tempMatViewProj = mat4.create();
		this.tempVec4 = vec4.create();
		this.tempVec4_2 = vec4.create();

		this.annotations = new SpatioTemporalAnnotationManager();

		this.timeYScaleBase = 0.00001;
		this.timeYScale = 0.00001;
		this.timeOrigin = 0;
		this.colorBufferWrittenCount = 0;

		this.coloringInfo = contentSource.coloringInfo || null;
		this.coloringIndexMap = new mobmap.LayerMarkerOptions.CustomIndexMapping();
		this.recordListArray = contentSource.record_list_array;
		this.timeListArray = this.generateTimeLists(this.recordListArray);
		this.highlightedIndex = -1;
//		console.log('*',this.recordListArray)

		this.generateVertexBuffer(gl);
		this.updateColoringIndexMap(this.coloringInfo);
	}
	
	function makeColorIndexForAttribute(nColors, record, boundAttrName, indexMap) {
		var rawVal = record[boundAttrName] | 0;
		
		if (indexMap && indexMap.enabled) {
			rawVal = indexMap.mapValue(rawVal);
		}
		
		if (rawVal < 0) { rawVal = 0; }
		else if (rawVal >= nColors) { rawVal = nColors - 1; }

		return rawVal;
	}
	
	function p2dot(Ax1, Ay1, Ax2, Ay2,  Bx1, By1, Bx2, By2) {
		var dxA = Ax2 - Ax1;
		var dyA = Ay2 - Ay1;
		var dxB = Bx2 - Bx1;
		var dyB = By2 - By1;
		
		return dxA*dxB + dyA*dyB;
	}

	function p2cross(Ax1, Ay1, Ax2, Ay2,  Bx1, By1, Bx2, By2) {
		var dxA = Ax2 - Ax1;
		var dyA = Ay2 - Ay1;
		var dxB = Bx2 - Bx1;
		var dyB = By2 - By1;
		
		return dxA * dyB - dyA * dxB;
	}
	
	function v2len(x, y) {
		return Math.sqrt(x*x + y*y);
	}
	
	ThreeDViewTrajectoryContent.prototype = {
		pickByScreenCoordinate: function(controller, sx, sy) {
			var oldTimeOrigin = this.timeOrigin;
			this.timeOrigin = -0.01;
			var pj = controller.projectionGird;
			controller.calcViewProjMatrix(this.tempMatViewProj);

			this.fillVertexSource(pj);
			
			var sl = this.startPositionList;
			
			var startPos = (sl.length - 1) >> 1;
			var lastPos = sl.length - 1;
			
			var candidateList = [];
			for (var i = startPos;i < lastPos;++i) {
				var startIndex = sl[i];
				var vcount = sl[i+1] - startIndex;
				
				var hitDistance = this.hittestWithLineStrip(this.possSrcArray, startIndex, vcount, sx, sy, oldTimeOrigin, this.tempMatViewProj);
				if (hitDistance !== false) {
					candidateList.push([i-startPos, hitDistance]);
				}
			}
			
			this.timeOrigin = oldTimeOrigin;
			
			// Check result
			if (candidateList.length > 0) {
				candidateList.sort(function(a,b) {
					return a[1] - b[1];
				});
				
				var nearestIndex = candidateList[0][0];
				if (controller.notifyTrajectoryPicked) {
					var selId = this.recordListArray[nearestIndex].id;
					controller.notifyTrajectoryPicked(nearestIndex, selId);
					this.updateContentUI(controller, nearestIndex, selId);
				}
			} else {
				if (controller.notifyTrajectoryPicked) {
					controller.notifyTrajectoryPicked(null, null);
					this.updateContentUI(controller, null, null);
				}
			}
		},

		updateContentUI: function(controller, selectionIndex, selectionId) {
			if (!controller) {
				return;
			}

			controller.clearContentUIArea();
			if (selectionIndex !== null) {
				var outer = document.createElement('div');
				outer.setAttribute('class', 'highlighted-obj-info');

				var titleEl = document.createElement('span');
				var headingEl = document.createElement('span');
				headingEl.setAttribute('class', 'highlighted-obj-heading');
				headingEl.innerHTML = '▪';
				
				var selButton = document.createElement('button');
				selButton.setAttribute('data-controller-command', 'sel1');
				selButton.setAttribute('data-target-id', selectionId);
				selButton.appendChild( document.createTextNode("Select only this") );

//				var annButton = document.createElement('button');
//				annButton.setAttribute('data-command', 'add_ann');

				titleEl.appendChild(headingEl);
				titleEl.appendChild( document.createTextNode('Highlighted ID='+selectionId ) );
				outer.appendChild(titleEl);
				outer.appendChild(selButton);
				controller.appendElementOnContentUIArea(outer);
			}
		},

		showContentUIRestoreButton: function(controller) {
			var idlist = this.generateIDList();

			var outer = document.createElement('div');
			outer.setAttribute('class', 'highlighted-obj-info');

			var restoreButton = document.createElement('button');
			restoreButton.appendChild( document.createTextNode("Restore last selection(" +idlist.length+  ")") );
			restoreButton.setAttribute('data-controller-command', 'restore-selection');
			restoreButton.setAttribute('data-idlist', idlist.join(','));

			outer.appendChild(restoreButton);
			controller.appendElementOnContentUIArea(outer);
		},

		notifyContentCommandWillBeExecuted: function(controller, commandName, param1) {
			controller.clearContentUIArea();
			if (commandName !== 'restore-selection') {
				this.showContentUIRestoreButton(controller);
			}
		},

		hittestWithLineStrip: function(vertexArray, startIndex, count, pickSX, pickSY, showingTimeOrigin, currentTransform) {
			var baseY = showingTimeOrigin * this.timeYScale;
			var vpos = startIndex * 3;
			var i;

			var tv = this.tempVec4;
			var tv2 = this.tempVec4_2;

			// Transform and store projected screen coordinates
			for (i = 0;i < count;++i) {
				tv[0] = vertexArray[vpos  ];
				tv[1] = vertexArray[vpos+1] - baseY;
				tv[2] = vertexArray[vpos+2];
				tv[3] = 1;
				
				vec4.transformMat4(tv2, tv, currentTransform);
				vertexArray[vpos  ] = tv2[0] / tv2[3];
				vertexArray[vpos+1] = tv2[1] / tv2[3];

				vpos += 3;
			}
			
			// Traverse again... and do hittest
			vpos = startIndex * 3;
			for (i = 0;i < (count-1);++i) {
				var dst = this.hittestPointAndSegment(vertexArray[vpos],vertexArray[vpos+1],
					                        vertexArray[vpos+3],vertexArray[vpos+4],
					                        pickSX, pickSY);
				if (dst < 1.0) {
					return dst;
				}
					
				vpos += 3;
			}
			
			return false;
		},
		
		hittestPointAndSegment: function(x1, y1, x2, y2,  tx, ty) {
			var eps = 0.00001;
			var near_th = 0.02;
			var swap_tmp;
			
			if (x1 > x2) {
				swap_tmp = x1;
				x1 = x2;
				x2 = swap_tmp;
			}

			if (y1 > y2) {
				swap_tmp = y1;
				y1 = y2;
				y2 = swap_tmp;
			}

			if (tx < (x1-near_th) || tx > (x2+near_th)) { return; }
			if (ty < (y1-near_th) || ty > (y2+near_th)) { return; }
			
			var distance = 999;
			if (p2dot(x1, y1, x2, y2,  x1, y1, tx, ty) < eps) {
				distance = v2len(tx-x1, ty-y1);
			} else if (p2dot(x2, y2, x1, y1,  x2, y2, tx, ty) < eps) {
				distance = v2len(tx-x2, ty-y2);
			} else {
				distance = Math.abs( p2cross(x1, y1, x2, y2,  x1, y1, tx, ty) / v2len(x2-x1, y2-y1) );
			}
			
			if (distance < near_th) {
				return distance;
			}
			
			return 999;
		},
		
		highlightByIndex: function(hIndex) {
			this.highlightedIndex = hIndex;
		},
		
		cancelHighlight: function() {
			this.highlightedIndex = -1;
		},
		
		setColoringInfo: function(newVal) {
			this.coloringInfo = newVal || null;
			this.updateColoringIndexMap(this.coloringInfo);
		},
		
		updateColoringIndexMap: function(coloringInfo) {
			this.coloringIndexMap.clearMap();
			
			var enabled = false;
			if (coloringInfo && coloringInfo.indexMap) {
				enabled = true;
				this.coloringIndexMap.importMap(coloringInfo.indexMap);
			}
			
			this.coloringIndexMap.enabled = enabled;
		},
		
		scaleTimeYScale: function(s) {
			var newVal = this.timeYScaleBase * s;
			var d = Math.abs(newVal - this.timeYScale);
			if (d < 0.00000001) {
				return false;
			}
			
			this.timeYScale = newVal;
			return true;
		},
		
		shouldUseColorIndexedAttribute: function() {
			if (!this.coloringInfo) { return false; }
			
			return this.coloringInfo.varyingType === mobmap.LayerMarkerOptions.MV_ATTR;
		},
		
		generateTimeLists: function(recordListArray) {
			var tls = [];
			
			var len = recordListArray.length;
			for (var i = 0;i < len;++i) {
				var rl = recordListArray[i];
				tls.push( this.generateATimeList( rl ) );
			}
			
			return tls;
		},
		
		generateATimeList: function(recordListContainer) {
			var tl = new mobmap.MovingData.TimeList(recordListContainer.id);

			var recordList = recordListContainer.recordList;
			var len = recordList.length;
			for (var i = 0;i < len;++i) {
				tl.addRecord(recordList[i]);
			}
			
			tl.close();
			return tl;
		},
		
		render: function(controller, currentTime) {
			this.timeOrigin = currentTime || 0;
			
			var gl = controller.gl;
			var shader = controller.colorShader;
			var pj = controller.projectionGird;
			shader.use(gl);
			shader.setPointSize(gl, 1);
			controller.updateViewMatrix(shader);
			
			this.fillVertexSource(pj);
			this.enableBuffers(gl, shader);
			this.sendBufferData(gl);
			
			// Send draw-call for line groups
			this.renderLinesByGroupList(gl, this.startPositionList);
			
			this.renderAnnotations(gl, controller);
			// Restore shader
			controller.colorShader.use(gl);
			this.enableBuffers(gl, controller.colorShader);
			
			if (currentTime || currentTime === 0) {
				//this.renderTimeCursor(gl, currentTime);
				this.renderTimeGuages(gl, currentTime, controller);
				this.renderTimeCursor(gl, currentTime, 1.4, false, true);
				shader.setPointSize(gl, 6);
				this.renderCurrentPositions(gl, currentTime, pj);
				shader.setPointSize(gl, 1);
			}
		},
		
		renderTimeGuages: function(gl, centerTime, controller) {
			var colorShader = controller.colorShader;
			var normalShader = controller.normalShader;

			var centerTimeObj = new Date(centerTime * 1000);

			var curS = centerTimeObj.getMinutes() * 60 + centerTimeObj.getSeconds();
			var secToNexthour = (3600 - curS);
			
			// just n-oclock
			var nextOrigin = centerTime + secToNexthour;
			var prevOrigin = centerTime - curS;
			var nextH = (new Date(nextOrigin * 1000)).getHours();
			var prevH = nextH - 1;
			
			function calcGuageAlpha(t) {
				var a = 1.0 - Math.abs(t - centerTime) / 172800.0;
				if (a < 0) {return 0;}
				
				return a;
			}
			
			var firstNormalShaderUse = true;

			for (var i = 0;i < 60;++i) {
				var laterS   = nextOrigin + 3600 * i;
				var earlierS = prevOrigin - 3600 * i;
				
				var lh = nextH + i;
				var eh = prevH - i;
				var emphColor = false;
				var galpha;

				if ((lh % 6) === 0) {
					emphColor = (lh % 24) === 0;
					galpha = calcGuageAlpha(laterS);
					this.renderTimeCursor(gl, laterS, galpha, emphColor);
					
					if (emphColor) {
						// Draw Date Label
						normalShader.use(gl);
						this.enableBuffers(gl, normalShader);
						this.enableTextureCoordsBuffer(gl, normalShader);
						if (firstNormalShaderUse) {
							controller.updateViewMatrix(normalShader);
							firstNormalShaderUse = false;
						}
						
						this.renderDateLabel(gl, laterS, galpha, normalShader);
						colorShader.use(gl);
						this.enableBuffers(gl, colorShader);
					}
				}
				
				if ((eh % 6) === 0) {
					emphColor = (eh % 24) === 0;
					galpha = calcGuageAlpha(earlierS);
					this.renderTimeCursor(gl, earlierS, galpha, emphColor);

					if (emphColor) {
						// Draw Date Label
						normalShader.use(gl);
						this.enableBuffers(gl, normalShader);
						this.enableTextureCoordsBuffer(gl, normalShader);
						if (firstNormalShaderUse) {
							controller.updateViewMatrix(normalShader);
							firstNormalShaderUse = false;
						}

						this.renderDateLabel(gl, earlierS, galpha, normalShader, true);
						colorShader.use(gl);
						this.enableBuffers(gl, colorShader);
					}
				}
			}
		},
		
		renderDateLabel: function(gl, timeInSeconds, alpha, normalShader, enableSlide) {
			if (!this.labelTextureObject) {
				this.labelTextureObject = ThreeDViewController.createTextureObject(gl, this.labelTexMan.canvas);
			}

			var containerSize = 1.0;
			var panel_h_h = containerSize * 0.1;
			var oneday_height = (24*3600) * this.timeYScale;
			var baseY = (timeInSeconds - this.timeOrigin) * this.timeYScale;
			var dateObj = new Date(timeInSeconds * 1000);
			var wd = dateObj.getDay();
			
			if (baseY < 0) {
				var slide_y = Math.min(-baseY, (oneday_height - panel_h_h));
				baseY += slide_y;
			}
			
			var foundCellInfo = this.labelTexMan.findCellByDateObject(dateObj, true);
			if (!foundCellInfo) {
				foundCellInfo = this.labelTexMan.allocate(dateObj);
			}
			
			if (!foundCellInfo) {
				// cannot allocate
				return;
			}


			//  Use and update texture
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, this.labelTextureObject);
			gl.uniform1i(normalShader.params.uTexture, 0);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.labelTexMan.canvas);
			gl.generateMipmap(gl.TEXTURE_2D);


			var cellIndex = foundCellInfo.cell;
			var u1 = this.labelTexMan.calcTexUBase(cellIndex);
			var v1 = this.labelTexMan.calcTexVBase(cellIndex);
			var u2 = u1 + this.labelTexMan.calcTexUSpan();
			var v2 = v1 + this.labelTexMan.calcTexVSpan();
			
			var vpos = 0;
			var cpos = 0;
			var tpos = 0;
			var vs = this.possSrcArrayShort;
			var clrs = this.colorSrcArrayShort;
			var tcs = this.tcSrcArrayShort;
			
			var x1 = -containerSize;
			var y1 = baseY + panel_h_h;
			
			var x2 = x1 + containerSize * 0.4;
			var y2 = baseY - panel_h_h;
			
			var z = -containerSize;
			
			var clrR = 1;
			var clrG = 1;
			var clrB = 1;
			
			if (wd === 0) { //  sun
				clrG = 0.6;
				clrB = 0.6;
			} else if (wd === 6) {
				clrR = 0.6;
				clrG = 0.7;
			}
			
			vs[vpos++] = x1;
			vs[vpos++] = y1;
			vs[vpos++] = z;
			
			tcs[tpos++] = u1;
			tcs[tpos++] = v1;

			clrs[cpos++] = clrR;
			clrs[cpos++] = clrG;
			clrs[cpos++] = clrB;
			clrs[cpos++] = alpha;


			vs[vpos++] = x2;
			vs[vpos++] = y1;
			vs[vpos++] = z;
			
			tcs[tpos++] = u2;
			tcs[tpos++] = v1;

			clrs[cpos++] = clrR;
			clrs[cpos++] = clrG;
			clrs[cpos++] = clrB;
			clrs[cpos++] = alpha;


			vs[vpos++] = x1;
			vs[vpos++] = y2;
			vs[vpos++] = z;
			
			tcs[tpos++] = u1;
			tcs[tpos++] = v2;

			clrs[cpos++] = clrR;
			clrs[cpos++] = clrG;
			clrs[cpos++] = clrB;
			clrs[cpos++] = alpha;

			this.sendBufferData(gl, true);
			gl.depthMask(false);
			gl.drawArrays(gl.TRIANGLES, 0, cpos/4);
			gl.depthMask(true);
		},

		renderTimeCursor: function(gl, time, alpha, specialColor, completeBox) {
			if (!alpha && alpha !== 0) {
				alpha = 1;
			}
			
			var cursorSize = 1.0;
			var vs = this.possSrcArrayShort;
			var clrs = this.colorSrcArrayShort;
			var writePos = 0;
			var cPos = 0;
			var i, j;
			
			if (!completeBox) {
				for (i = 0;i < 2;++i) {
					var x = (i == 1) ? 1 : -1;
					var z = -1;

					vs[writePos++] = x * cursorSize;
					vs[writePos++] = (time - this.timeOrigin) * this.timeYScale;
					vs[writePos++] = z * cursorSize;

					clrs[cPos++] = 0.8;
					clrs[cPos++] = 0.8;
					clrs[cPos++] = specialColor ? 0 : 0.8;
					clrs[cPos++] = specialColor ? alpha : (alpha*0.5);
				}
			} else {
				for (j = 0;j < 4;++j) {
					var x, z;
					
					for (i = 0;i <= 2;++i) {
						if (j < 2) { // X axis 
							x = (i - 1) * 2;
							z = -1 + (j*2);
						} else {
							x = -1 + ((j-2)*2);
							z = (i - 1) * 2;
						}
						
						vs[writePos++] = x * cursorSize;
						vs[writePos++] = (time - this.timeOrigin) * this.timeYScale;
						vs[writePos++] = z * cursorSize;

						clrs[cPos++] = 0.8;
						clrs[cPos++] = 0.8;
						clrs[cPos++] = specialColor ? 0 : 0.8;
						if (i == 1) {
							clrs[cPos++] = specialColor ? alpha : (alpha*0.5);
						} else {
							clrs[cPos++] = 0;
						}
					
						if (i === 1) { // dup
							vs[writePos] = vs[writePos-3]; ++writePos;
							vs[writePos] = vs[writePos-3]; ++writePos;
							vs[writePos] = vs[writePos-3]; ++writePos;
						
							clrs[cPos] = clrs[cPos-4]; ++cPos;
							clrs[cPos] = clrs[cPos-4]; ++cPos;
							clrs[cPos] = clrs[cPos-4]; ++cPos;
							clrs[cPos] = clrs[cPos-4]; ++cPos;
						}
					}

				}
				
			}
			
			/*
			for (var i = 0;i <= 4;++i) {
				var x = (i == 1 || i == 2) ? 1 : -1;
				var z = (i == 2 || i == 3) ? 1 : -1;
				
				vs[writePos++] = x * cursorSize;
				vs[writePos++] = (time - this.timeOrigin) * this.timeYScale;
				vs[writePos++] = z * cursorSize;
				
				clrs[cPos++] = 0.8;
				clrs[cPos++] = 0.8;
				clrs[cPos++] = specialColor ? 0 : 0.8;
				clrs[cPos++] = specialColor ? alpha : (alpha*0.5);
				
				if (!completeBox && i > 0) {
					break;
				}
			}*/

			this.sendBufferData(gl, true);
			gl.drawArrays(gl.LINES, 0, cPos/4);
		},
		
		renderCurrentPositions: function(gl, time, projectionProvider) {
			var nVertices = this.fillCurrentPositionMarkers(gl, time, projectionProvider,
				this.possSrcArray, this.colorSrcArray);
			
			this.sendBufferData(gl);
			gl.drawArrays(gl.POINTS, 0, nVertices);
		},

		fillCurrentPositionMarkers: function(gl, time, projectionProvider, vlist, clist) {
			var use_color_index = this.shouldUseColorIndexedAttribute();

			var a = _tempAntData;
			var tw2 = projectionProvider.getEntireScreenWidth() * 0.5;
			var th2 = projectionProvider.getEntireScreenHeight() * 0.5;
			
			var vpos = 0;
			var cpos = 0;
			var nWrittenVertices = 0;

			var pickedRec = this.pickTempRecord;
			var TLs = this.timeListArray;
			var len = TLs.length;
			for (var i = 0;i < len;++i) {
				var tl = TLs[i];
				var xmap = null;
				var colorIndex = 0;
				
				// Set extra attributes (if needed)
				if (use_color_index) {
					xmap = this.coloringInfo.extraAttributesMap;
				}
				
				tl.pickAt(null, pickedRec, time, xmap, 0);
				
				a.lat = pickedRec.y;
				a.lng = pickedRec.x;
				projectionProvider.calc(a);
				
				vlist[vpos++] = a.screenX / tw2 - 1.0;
				vlist[vpos++] = 0.002;
				vlist[vpos++] = a.screenY / th2 - 1.0;;

				// Determine marker color (if needed)
				if (use_color_index) {
					colorIndex = makeColorIndexForAttribute(this.coloringInfo.baseColorList.length, pickedRec, this.coloringInfo.boundAttribute, this.coloringIndexMap);
					var markerBaseColor = this.coloringInfo.baseColorList[colorIndex];

					clist[cpos++] = markerBaseColor.r / 255.0;
					clist[cpos++] = markerBaseColor.g / 255.0;
					clist[cpos++] = markerBaseColor.b / 255.0;
				} else {
					clist[cpos++] = 0.4;
					clist[cpos++] = 0.5;
					clist[cpos++] = 1.0;
				}

				clist[cpos++] = 2.0;
				
				++nWrittenVertices;
			}
			
			return nWrittenVertices;
		},

		renderLinesByGroupList: function(gl, startPosList) {
			var nLineGroups = startPosList.length - 1; // Last item is the terminator
			for (var i = 0;i < nLineGroups;++i) {
				this.renderLineGroup(gl, startPosList, i);
			}
		},

		renderLineGroup: function(gl, startPosList, groupIndex) {
			//console.log(recordList)
			var start = startPosList[groupIndex];
			var nextStart = start;
			if (groupIndex < (startPosList.length-1)) {
				nextStart = startPosList[groupIndex + 1];
			}

//			console.log(start, nextStart - start);
//			console.log(start, nextStart - start, this.possSrcArray.length)
			gl.drawArrays(gl.LINE_STRIP, start, nextStart - start);
		},

		countAllVertices: function(extra) {
			var sum = 0;
			
			var nObjects = this.recordListArray.length;
			for (var i = 0;i < nObjects;++i) {
				sum += this.recordListArray[i].recordList.length;
				if (extra) {
					sum += extra;
				}
			}

			return sum;
		},

		generateVertexBuffer: function(gl) {
			// Vertex Buffer Object
			var vb = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vb);
			
			// Source Array
			var nVertices = this.countAllVertices(1);
			if (nVertices < 16) {
				// Minimum required for system rendering
				nVertices = 16;
			}
			
			this.possSrcArray = new Float32Array( nVertices * this.dimension );
			this.possSrcArrayShort = new Float32Array( 16 * this.dimension );
			this.vbPoss = vb;

			gl.bufferData(gl.ARRAY_BUFFER, this.possSrcArray, gl.DYNAMIC_DRAW);


			// Vertex Buffer Object
			var vbc = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vbc);
			
			this.colorSrcArray = new Float32Array( nVertices * 4 );
			this.colorSrcArrayShort = new Float32Array( 16 * 4 );
			this.vbColors = vbc;

			gl.bufferData(gl.ARRAY_BUFFER, this.colorSrcArray, gl.DYNAMIC_DRAW);
			
			
			// Texture Coordinates
			// Vertex Buffer Object
			var vbt = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vbt);
			
			this.tcSrcArrayShort = new Float32Array( 16 * 2 );
			this.vbTexCoords = vbt;
			
			gl.bufferData(gl.ARRAY_BUFFER, this.tcSrcArrayShort, gl.DYNAMIC_DRAW);
		},

		clearAllLineGroupLists: function() {
			this.startPositionList.length = 0;
		},

		fillVertexSource: function(projectionProvider) {
			var writePos = 0;
			var currentTime = this.timeOrigin;
			this.colorBufferWrittenCount = 0;
			this.clearAllLineGroupLists();

			var i;
			var nObjects = this.recordListArray.length;
			for (var phase = 0;phase < 2;++phase) {
				for (i = 0;i < nObjects;++i) {
					var rlist = this.recordListArray[i].recordList;
					var rlen = rlist.length;
					var splitPos = this.splitRecorListAtCurrentTime(rlist, currentTime);
					//console.log(splitPos)
					this.startPositionList.push( Math.floor(writePos / this.dimension) );
					
					var redOverride = null;
					if (i == this.highlightedIndex) {
						redOverride = 0.8;
					}
					
					if (phase === 0) {
						writePos += this.fillPositionsArray(this.possSrcArray, writePos, rlist, projectionProvider, this.colorSrcArray, 0, splitPos,  redOverride);
					} else {
						writePos += this.fillPositionsArray(this.possSrcArray, writePos, rlist, projectionProvider, this.colorSrcArray, Math.max(0, splitPos - 1), rlen,  redOverride);
					}
				}
			}

			// Finish position
			this.startPositionList.push( Math.floor(writePos / this.dimension) );
			
			//     Num of vertices
			return (this.colorBufferWrittenCount >> 2);
		},
		
		splitRecorListAtCurrentTime: function(recordList, t) {
			var len = recordList.length;
			var nSegs = len-1;
			for (var i = 0;i < nSegs;++i) {
				var rec = recordList[i];
				if (rec._time >= t) {
					return i;
				}
			}
			
			return len;
		},
		
		sendBufferData: function(gl, useShortSource) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbColors);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, useShortSource ? this.colorSrcArrayShort : this.colorSrcArray);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbPoss);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, useShortSource ? this.possSrcArrayShort : this.possSrcArray);
			
			if (useShortSource) {
				gl.bindBuffer(gl.ARRAY_BUFFER, this.vbTexCoords);
				gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.tcSrcArrayShort);
			}
		},
		
		fillPositionsArray: function(dest, startVertexIndex, recordList, projectionProvider, colorDest, srcStartIndex, afterEndIndex, redOverride) {
			var i;
			var vi = 0;
			var cIndex = this.colorBufferWrittenCount;
			var a = _tempAntData;
			
			var tw2 = projectionProvider.getEntireScreenWidth() * 0.5;
			var th2 = projectionProvider.getEntireScreenHeight() * 0.5;
			
			/*
			var oT = (len < 1) ? 0 : recordList[0]._time;
			if (oT < this.timeOrigin) {
				this.timeOrigin = oT;
			}*/
			
			var use_color_index = this.shouldUseColorIndexedAttribute();

			for (i = srcStartIndex;i < afterEndIndex;++i) {
				var rec = recordList[i];
				a.lat = rec.y;
				a.lng = rec.x;
				projectionProvider.calc(a);
				
				dest[startVertexIndex + vi] = a.screenX / tw2 - 1.0;
				++vi;
				
				dest[startVertexIndex + vi] = (rec._time - this.timeOrigin) * this.timeYScale;
				++vi;
				
				dest[startVertexIndex + vi] = a.screenY / th2 - 1.0;
				++vi;
				
				if (use_color_index) {
					var colorIndex = makeColorIndexForAttribute(this.coloringInfo.baseColorList.length, rec, this.coloringInfo.boundAttribute, this.coloringIndexMap);
					var markerBaseColor = this.coloringInfo.baseColorList[colorIndex];
					
					colorDest[cIndex++] = redOverride || (markerBaseColor.r / 255.0);
					colorDest[cIndex++] = markerBaseColor.g / 255.0;
					colorDest[cIndex++] = markerBaseColor.b / 255.0;

					colorDest[cIndex++] = 1;
				} else {
					colorDest[cIndex++] = redOverride || 0.1;
					colorDest[cIndex++] = 0.2;
					colorDest[cIndex++] = 1;
					colorDest[cIndex++] = 1;
				}
			}
			
			this.colorBufferWrittenCount = cIndex;
			return vi;
		},
		
		
		renderAnnotations: function(gl, controller) {
			var a_shader = controller.annPointShader;
			a_shader.use(gl);
			
			a_shader.setPointSize(gl, 40);
			controller.updateViewMatrix(a_shader);
			this.enableBuffers(gl, a_shader);

			var pj = controller.projectionGird;
			var nVerteicesToRender = this.fillAnnotationVertices(pj);
			
			this.sendBufferData(gl);
			gl.drawArrays(gl.POINTS, 0, nVerteicesToRender);
		},
		
		fillAnnotationVertices: function(projectionProvider) {
			var vs = this.possSrcArray;
			var clrs = this.colorSrcArray;

			var nAnnotations = this.annotations.getCount();
			var nMax = clrs.length >> 2;
			
			var nToDraw = Math.min(nMax, nAnnotations);
			
			var vi = 0;
			var ci = 0;
			for (var i = 0;i < nToDraw;++i) {
				var ann = this.annotations.getAt(i);
				this.addAnnotationVertex(projectionProvider, vs, clrs, vi, ci, ann);
				
				vi += 3;
				ci += 4;
			}
			
			return i;
		},
		
		addAnnotationVertex: function(projectionProvider, vertexArray, colorArray, vi, ci, ann) {
			var a = _tempAntData;
			var tw2 = projectionProvider.getEntireScreenWidth() * 0.5;
			var th2 = projectionProvider.getEntireScreenHeight() * 0.5;

			a.lat = ann.lat;
			a.lng = ann.lng;
			projectionProvider.calc(a);

			// Position
			vertexArray[vi  ] = a.screenX / tw2 - 1.0;
			vertexArray[vi+1] = (ann.t - this.timeOrigin) * this.timeYScale;
			vertexArray[vi+2] = a.screenY / th2 - 1.0;
			
			// Color
			colorArray[ci  ] = 1.0;
			colorArray[ci+1] = 0.5;
			colorArray[ci+2] =   0;
			colorArray[ci+3] = 1.0;
		},
		
		
		enableBuffers: function(gl, shader) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbPoss);
			gl.vertexAttribPointer(shader.params.aPosition, this.dimension, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.params.aPosition);
//console.log(gl)
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbColors);
			gl.vertexAttribPointer(shader.params.aColor,
				4, // components per vertex
				gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.params.aColor);
		},
		
		enableTextureCoordsBuffer: function(gl, shader) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbTexCoords);
			gl.vertexAttribPointer(shader.params.aTexCoord, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shader.params.aTexCoord);
		},
		
		disableTextureCoordsBuffer: function(gl, shader) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbTexCoords);
			gl.disableVertexAttribArray(shader.params.aTexCoord);
		},
		
		generateIDList: function() {
			var resultList = [];
			
			var ls = this.recordListArray;
			for (var i in ls) {
				resultList.push( this.recordListArray[i].id );
			}
			
			return resultList;
		}
	};
	
	ThreeDViewController.setBlendParams = function(gl, addMode) {
		if (!addMode) {
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		} else {
			gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.SRC_ALPHA, gl.ONE);
		}
	}
	
	var _tempVecEyePos = [0,0,0];
	var _tempAntData = {
		lat:0, lng:0,
		screenX:0, screenY:0
	};	
})();