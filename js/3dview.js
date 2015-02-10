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
			this.mapTexture = this.initializeMapTexture(loadedImage);
			this.panelBaseTexture = this.initializePanelBaseTexture();
			var resizeFunc = this.observeResize();
			this.observeUserInput();
			
			resizeFunc();
			
			window.sendRequestProjectionData(this.targetLayerId, this.mapTextureViewport);
			window.sendRequest3DViewTargetData(this.targetLayerId);
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
		
		receiveCurrentTime: function(newTime) {
			this.currentInSeconds = newTime;

			this.viewDirty = true;
			this.render();
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

		initializePanelBaseTexture: function() {
			return ThreeDViewController.createTextureObject(this.gl, gBlackTextureImage);
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
			this.clearView();
			
			gl.enable(gl.BLEND);
			ThreeDViewController.setBlendParams(gl, true);
						
			// Draw content
			gl.enable(gl.DEPTH_TEST);
			gl.depthMask(true);
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
		
		calcEyePos: function(outVec) {
			var a = this.viewState.rotY;
			var x = Math.sin(a);
			var z = Math.cos(a);
			
			outVec[0] = x * this.viewState.distance;
			outVec[1] = this.viewState.eyePosY;
			outVec[2] = z * this.viewState.distance;
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
		this.possSrcArray = null;
		this.colorSrcArray = null;
		this.startPositionList = [];
		this.pickTempRecord = mobmap.MovingData.createEmptyRecord();

		this.timeYScale = 0.00001;
		this.timeOrigin = 0;
		this.colorBufferWrittenCount = 0;

		this.coloringInfo = contentSource.coloringInfo || null;
		this.recordListArray = contentSource.record_list_array;
		this.timeListArray = this.generateTimeLists(this.recordListArray);
//		console.log('*',this.recordListArray)

		this.generateVertexBuffer(gl);
	}
	
	ThreeDViewTrajectoryContent.prototype = {
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
			
			var nObjects = this.recordListArray.length;
			for (var i = 0;i < nObjects;++i) {
				this.renderRecordList(gl, i);
			}
			
			if (currentTime || currentTime === 0) {
				//this.renderTimeCursor(gl, currentTime);
				this.renderTimeGuages(gl, currentTime);
				this.renderTimeCursor(gl, currentTime, 1.4, false, true);
				shader.setPointSize(gl, 6);
				this.renderCurrentPositions(gl, currentTime, pj);
				shader.setPointSize(gl, 1);
			}
		},
		
		renderTimeGuages: function(gl, centerTime) {
			var centerTimeObj = new Date(centerTime * 1000);

			var curS = centerTimeObj.getMinutes() * 60 + centerTimeObj.getSeconds();
			var secToNexthour = (3600 - curS);
			
			// just n-oclock
			var nextOrigin = centerTime + secToNexthour;
			var prevOrigin = centerTime - curS;
			var nextH = (new Date(nextOrigin * 1000)).getHours();
			var prevH = nextH - 1;
			
			function calcGuageAlpha(t) {
				var a = 1.0 - Math.abs(t - centerTime) / 144000.0;
				if (a < 0) {return 0;}
				
				return a;
			}
			
			for (var i = 0;i < 60;++i) {
				var laterS   = nextOrigin + 3600 * i;
				var earlierS = prevOrigin - 3600 * i;
				
				var lh = nextH + i;
				var eh = prevH - i;
				var emphColor = false;

				if ((lh % 6) === 0) {
					emphColor = (lh % 24) === 0;
					this.renderTimeCursor(gl, laterS, calcGuageAlpha(laterS), emphColor);
				}
				
				if ((eh % 6) === 0) {
					emphColor = (eh % 24) === 0;
					this.renderTimeCursor(gl, earlierS, calcGuageAlpha(earlierS), emphColor);
				}
			}
		},
		
		renderTimeCursor: function(gl, time, alpha, specialColor, completeBox) {
			if (!alpha && alpha !== 0) {
				alpha = 1;
			}
			
			var cursorSize = 1.0;
			var vs = this.possSrcArray;
			var clrs = this.colorSrcArray;
			var writePos = 0;
			var cPos = 0;
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
			}

			this.sendBufferData(gl);
			gl.drawArrays(gl.LINE_STRIP, 0, cPos/4);
		},
		
		renderCurrentPositions: function(gl, time, projectionProvider) {
			var nVertices = this.fillCurrentPositionMarkers(gl, time, projectionProvider,
				this.possSrcArray, this.colorSrcArray);
			
			this.sendBufferData(gl);
			gl.drawArrays(gl.POINTS, 0, nVertices);
		},

		fillCurrentPositionMarkers: function(gl, time, projectionProvider, vlist, clist) {
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
				tl.pickAt(null, pickedRec, time, null, 0);

				a.lat = pickedRec.y;
				a.lng = pickedRec.x;
				projectionProvider.calc(a);
				
				vlist[vpos++] = a.screenX / tw2 - 1.0;
				vlist[vpos++] = 0.002;
				vlist[vpos++] = a.screenY / th2 - 1.0;;
				
				clist[cpos++] = 0.4;
				clist[cpos++] = 0.5;
				clist[cpos++] = 1.0;
				clist[cpos++] = 2.0;
				
				++nWrittenVertices;
			}
			
			return nWrittenVertices;
		},
		
		renderRecordList: function(gl, groupIndex) {
			//console.log(recordList)
			var start = this.startPositionList[groupIndex];
			var nextStart = Math.floor(this.possSrcArray.length / this.dimension);
			if (groupIndex < (this.recordListArray.length-1)) {
				nextStart = this.startPositionList[groupIndex + 1];
			}

//			console.log(start, nextStart - start);
//			console.log(start, nextStart - start, this.possSrcArray.length)
			gl.drawArrays(gl.LINE_STRIP, start, nextStart - start);
		},

		countAllVertices: function() {
			var sum = 0;
			
			var nObjects = this.recordListArray.length;
			for (var i = 0;i < nObjects;++i) {
				sum += this.recordListArray[i].recordList.length;
			}

			return sum;
		},

		generateVertexBuffer: function(gl) {
			// Vertex Buffer Object
			var vb = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vb);
			
			// Source Array
			var nVertices = this.countAllVertices();
			this.possSrcArray = new Float32Array( nVertices * this.dimension );
			this.vbPoss = vb;

			gl.bufferData(gl.ARRAY_BUFFER, this.possSrcArray, gl.DYNAMIC_DRAW);


			// Vertex Buffer Object
			var vbc = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vbc);
			
			this.colorSrcArray = new Float32Array( nVertices * 4 );
			this.vbColors = vbc;

			gl.bufferData(gl.ARRAY_BUFFER, this.colorSrcArray, gl.DYNAMIC_DRAW);
		},
		
		fillVertexSource: function(projectionProvider) {
			var writePos = 0;
			this.colorBufferWrittenCount = 0;
			this.startPositionList.length = 0;

			var nObjects = this.recordListArray.length;
			for (var i = 0;i < nObjects;++i) {
				var rlist = this.recordListArray[i].recordList;
				this.startPositionList.push( Math.floor(writePos / this.dimension) );
				writePos += this.fillPositionsArray(this.possSrcArray, writePos, rlist, projectionProvider, this.colorSrcArray);
			}
		},
		
		sendBufferData: function(gl) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbColors);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colorSrcArray);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbPoss);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.possSrcArray);
		},
		
		fillPositionsArray: function(dest, startVertexIndex, recordList, projectionProvider, colorDest) {
			var i;
			var vi = 0;
			var cIndex = this.colorBufferWrittenCount;
			var len = recordList.length;
			var a = _tempAntData;
			
			var tw2 = projectionProvider.getEntireScreenWidth() * 0.5;
			var th2 = projectionProvider.getEntireScreenHeight() * 0.5;
			
			/*
			var oT = (len < 1) ? 0 : recordList[0]._time;
			if (oT < this.timeOrigin) {
				this.timeOrigin = oT;
			}*/

			for (i = 0;i < len;++i) {
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

				colorDest[cIndex++] = 0.1;
				colorDest[cIndex++] = 0.2;
				colorDest[cIndex++] = 1;
				colorDest[cIndex++] = 1;
			}
			
			this.colorBufferWrittenCount = cIndex;
			return vi;
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