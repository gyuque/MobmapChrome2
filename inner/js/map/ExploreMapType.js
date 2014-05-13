if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function ExploreMapType(ownerMap) {
		this.ownerMap = ownerMap;
		this.ownerObject = null;
		this.viewType = ExploreMapType.ViewType.Trajectory;
		this.tileSize = new google.maps.Size(256, 256);
		this.renderAtlas = new RenderAtlas(this.tileSize, ownerMap, this);
		this.refTargetSelectedIDs = null;
		this.dataSource = null;
		this.doMarchingAnimationClosure = this.doMarchingAnimation.bind(this);
		
		this.timeRange = {
			start: null,
			end: null
		};
		
		google.maps.event.addListener(ownerMap, 'zoom_changed', this.onMapZoomChange.bind(this));
	}
	
	ExploreMapType.ViewType = {
		Trajectory: 0,
		Marching: 1
	};
	
	ExploreMapType.prototype.setVisibility = function(v) {
		if (this.renderAtlas.currentVisibility === v) {
			return;
		}

		this.renderAtlas.currentVisibility = v;
		if (v) {
			this.doMarchingAnimationClosure();
			this.renderAtlas.resetJob();
			this.renderAtlas.reserveJobNext();
		} else {
			this.renderAtlas.clearAllTiles();
		}
	};

	ExploreMapType.prototype.setViewType = function(v) {
		if (this.viewType === v) {
			return;
		}

		this.viewType = v;
		if (v === ExploreMapType.ViewType.Marching) {
			this.rebuildTrajectoryMap(false);
			this.initMarchingView();
			this.doMarchingAnimation();
		} else {
			this.renderAtlas.clearAllTiles();
			this.rebuildTrajectoryMap(false);
		}
	};

	ExploreMapType.prototype.onMapZoomChange = function() {
		this.renderAtlas.clear();
		this.rebuildTrajectoryMap(true);
	};

	ExploreMapType.prototype.initMarchingView = function() {
		this.renderAtlas.clearAllTiles();
	};

	ExploreMapType.prototype.getTrajectoryDefaultColor = function() {
		if (!this.ownerObject) { return null;}
		return this.ownerObject.trajectoryDefaultColor;
	};
	
	ExploreMapType.prototype.getTrajectoryAddComposition = function() {
		if (!this.ownerObject) { return null;}
		return this.ownerObject.trajectoryAddComposition;
	};

	ExploreMapType.prototype.getTrajectoryUseMarkerColor = function() {
		if (!this.ownerObject) { return false;}
		return this.ownerObject.trajectoryUseMarkerColor;
	};
	
	ExploreMapType.prototype.getTrajectoryColoringMode = function() {
		if (!this.ownerObject) { return null;}
		return this.ownerObject.trajectoryColoringMode;
	};

	ExploreMapType.prototype.rebuildTrajectoryMap = function(delayRender) {
		this.renderAtlas.invalidateOffscreenCanvas();
		if (delayRender) {
			this.renderAtlas.resetJob();
			this.renderAtlas.reserveJobNext(true);
		} else {
			this.renderAtlas.updateCanvasSize();
		}
	};
	
	ExploreMapType.prototype.isReferringAnySelection = function() {
		if (!this.refTargetSelectedIDs) { return false; }
		
		return this.refTargetSelectedIDs.length > 0;
	};

	ExploreMapType.installMapType = function(targetGMap) {
		var mt = new ExploreMapType(targetGMap);
		targetGMap.overlayMapTypes.insertAt(0, mt);
		return mt;
	};
	
	ExploreMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
		var tileKey = ExploreMapType.makeTileKey(coord.x, coord.y);
		var tileElement = ownerDocument.createElement('canvas');
		setCanvasSize(tileElement, this.tileSize.width, this.tileSize.height);
		
		//tileElement.style.boxShadow = "0 0 3px rgba(10,90,0,0.5) inset";
		tileElement._cx = coord.x;
		tileElement._cy = coord.y;
		tileElement._lastRenderedIndex = -1;
		tileElement._tileKey = tileKey;
		this.writeTileBounds(tileElement, coord, zoom);

		this.renderAtlas.addTile(tileKey, tileElement);
		this.renderAtlas.setZoom(zoom);

		this.renderAtlas.transferOneTile(tileElement);

		return tileElement;
	};
	
	ExploreMapType.prototype.writeTileBounds = function(target, tileCoord, zoom) {
		var wsize = Math.pow(2, zoom);
		var wx = tileCoord.x * this.tileSize.width;
		var wy = tileCoord.y * this.tileSize.height;
		
		var nx = wx / wsize;
		var ny = wy / wsize;
		
		var proj = this.ownerMap.getProjection();
		var latlng1 = proj.fromPointToLatLng( new google.maps.Point(nx, ny) );
		var latlng2 = proj.fromPointToLatLng( new google.maps.Point(nx+this.tileSize.width/wsize, ny+this.tileSize.height/wsize) );

		target._min_lat = latlng2.lat();
		target._min_lng = latlng1.lng();
		target._max_lat = latlng1.lat();
		target._max_lng = latlng2.lng();
	};
	
	ExploreMapType.prototype.releaseTile = function(tileToRemove) {
		this.renderAtlas.removeTile(tileToRemove._tileKey);
	};
	
	ExploreMapType.prototype.setDataSource = function(ds) {
		if (this.dataSource === ds) {
			return;
		}
		
		// Check implementation
		if (ds) {
			checkPolylineDatasourceImplementation(ds);
		}
		
		this.dataSource = ds;
		this.referSelectionIfNeeded();
		
		this.renderAtlas.dataSource = ds;
		this.restartTrajectoryDrawing();
	};

	ExploreMapType.prototype.restartTrajectoryDrawing = function() {
		this.renderAtlas.clearAllTiles();
		this.renderAtlas.resetJob();
		this.renderAtlas.reserveJobNext();
	};

	ExploreMapType.makeTileKey = function(cx, cy) {
		return cx +'_'+ cy;
	};

	ExploreMapType.prototype.checkMarchingDataSource = function() {
		var ds = this.dataSource;
		if (!ds) { return false; }
		if (!ds.capabilities) { return false; }

		return (ds.capabilities & mobmap.LayerCapability.MarkerRenderable) !== 0 && !!(ds.movingData);
	};

	ExploreMapType.prototype.doMarchingAnimation = function() {
		var idList = this.refTargetSelectedIDs;
		if (this.viewType !== ExploreMapType.ViewType.Marching || !this.renderAtlas.currentVisibility) { return; }
		if (!idList || !this.checkMarchingDataSource()) { return; }
		if (idList.length !== 1) { return; }

		this.renderAtlas.renderOffscreenMarching(idList);
		
		requestAnimationFrame(this.doMarchingAnimationClosure);
	};

	ExploreMapType.prototype.referSelectedIDList = function(ls) {
		this.renderAtlas.clearAllTiles();

		this.refTargetSelectedIDs = ls;
		
		// Update screen
		if (this.viewType === ExploreMapType.ViewType.Trajectory) {
			this.renderAtlas.resetJob();
			this.renderAtlas.reserveJobNext();
		} else {
			this.doMarchingAnimation();
		}
	};
	
	ExploreMapType.prototype.refreshIfDependsData = function() {
		if (this.getTrajectoryUseMarkerColor()) {
			this.restartTrajectoryDrawing();
		}
	};

	ExploreMapType.prototype.setTimeRange = function(startTime, endTime) {
		this.timeRange.start = startTime;
		this.timeRange.end = endTime;
		this.restartTrajectoryDrawing();
	},
	
	ExploreMapType.prototype.isIDReffered = function(objId) {
		return this.refTargetSelectedIDs.indexOf(objId) >= 0;
	};
	
	ExploreMapType.prototype.referSelectionIfNeeded = function() {
		var sel = null;
		if (this.ownerObject) {
			sel = this.ownerObject.getTargetSelectedIDList();
		}
		
		this.referSelectedIDList(sel);
	};


	function RenderAtlas(tileSize, ownerMap, ownerMapType) {
		this.currentVisibility = true;
		this.consumeJobClosure = this.consumeJob.bind(this);

		this.jobChunkSize = 900;
		this.jobFinishedCount = 0;
		this.nowJobRunning = false;
		this.nextDelayStartJob = false;
		
		this.tileSize = tileSize;
		this.ownerMap = ownerMap;
		this.ownerMapType = ownerMapType;
		this.canvas = document.createElement('canvas');
		this.tileKeyMap = {};
		this.currentZoom = 1;
		this.dataSource = null;

		this.canvasStatus = {
			minCX:0,maxCX:0,
			minCY:0,maxCY:0,
			width:0,
			height:0
		};

		this.tilesState = {
			minCX:0,maxCX:0,
			minCY:0,maxCY:0
		};

		this.defaultStrokeStyle = '#35d';
		this.renderNodes = false;
		this.tempPickRecord = mobmap.MovingData.createEmptyRecord();
		this.dirtyMap = {};
	}

	RenderAtlas.prototype = {
		setZoom: function(z) {
			this.currentZoom = z;
		},

		clear: function() {
			var m = this.tileKeyMap;
			for (var k in m) if (m.hasOwnProperty(k)) {
				delete m[k];
			}
		},

		clearAllTiles: function() {
			var w = this.tileSize.width;
			var h = this.tileSize.height;
			
			var m = this.tileKeyMap;
			for (var k in m) if (m.hasOwnProperty(k)) {
				var tileObj = m[k];
				var g = tileObj.getContext('2d');
				
				g.clearRect(0, 0, w, h);
				tileObj._lastRenderedIndex = -1;
			}
		},

		resetJob: function() {
			var g = this.canvas.getContext('2d');
			g.clearRect(0, 0, this.canvasStatus.width, this.canvasStatus.height);

			this.jobFinishedCount = 0;
		},

		invalidateOffscreenCanvas: function() {
			var s = this.canvasStatus;
			s.minCX = s.maxCX = s.minCY = s.maxCY = s.width = s.height = 0;
		},

		addTile: function(tileKey, tileObject) {
			this.tileKeyMap[tileKey] = tileObject;
			this.calcTileBounds();
			this.updateCanvasSize();
		},

		removeTile: function(tileKey) {
			delete this.tileKeyMap[tileKey];
		},

		calcTileBounds: function() {
			var minCX =  99999999;
			var maxCX = -99999999;
			var minCY =  99999999;
			var maxCY = -99999999;

			var m = this.tileKeyMap;
			for (var k in m) if (m.hasOwnProperty(k)) {
				var tileObj = m[k];
				var cx = tileObj._cx;
				var cy = tileObj._cy;

				minCX = Math.min(minCX, cx);
				maxCX = Math.max(maxCX, cx);
				minCY = Math.min(minCY, cy);
				maxCY = Math.max(maxCY, cy);
			}

			this.tilesState.minCX = minCX;
			this.tilesState.maxCX = maxCX;
			this.tilesState.minCY = minCY;
			this.tilesState.maxCY = maxCY;
/*
			console.log('XRange', minCX, maxCX)
			console.log('YRange', minCY, maxCY)
			*/
		},

		updateCanvasSize: function() {
			var needed = this.checkCanvasExpandNeeded();
			if (!needed) {
				return;
			}

			//console.log("REQ");

			var cs = this.canvasStatus;
			var ts = this.tilesState;
			var nMargin = (this.ownerMapType.viewType === ExploreMapType.ViewType.Trajectory) ? 3 : 1;

			cs.minCX = ts.minCX - nMargin;
			cs.maxCX = ts.maxCX + nMargin;
			cs.minCY = ts.minCY - nMargin;
			cs.maxCY = ts.maxCY + nMargin;

			var cw = (cs.maxCX - cs.minCX) * this.tileSize.width;
			var ch = (cs.maxCY - cs.minCY) * this.tileSize.height;

			cs.width = Math.floor(cw);
			cs.height = Math.floor(ch);
			setCanvasSize(this.canvas, cs.width, cs.height);

			this.resetJob();
			this.reserveJobNext();
			//console.log(cw,ch)
		},

		checkCanvasExpandNeeded: function() {
			var cs = this.canvasStatus;
			var ts = this.tilesState;

			if (ts.minCX <= cs.minCX || 
				ts.maxCX >= cs.maxCX ||
				ts.minCY <= cs.minCY ||
				ts.maxCY >= cs.maxCY) {
				return true;
			}

			return false;
		},

		consumeJob: function() {
			this.nowJobRunning = false;
			var ds = this.dataSource;
			if (!ds || !this.currentVisibility ||
				this.ownerMapType.viewType !== ExploreMapType.ViewType.Trajectory) {
				return;
			}

			var g = this.canvas.getContext('2d');
			var shouldContinue = false;
			var n = this.jobChunkSize;
			if (this.jobFinishedCount === 0) {
				n >>= 2;
			}
			
			var plCount = ds.tpCountPolylines();
			var plLastIndex = plCount - 1;
			if (this.jobFinishedCount > plLastIndex) {
				return;
			}
			
			var anySelected = this.ownerMapType.isReferringAnySelection();
			var defaultColor = this.ownerMapType.getTrajectoryDefaultColor();
			var use_mkclr = this.ownerMapType.getTrajectoryUseMarkerColor();

			g.save();
			if (this.ownerMapType.getTrajectoryAddComposition()) {
				g.globalCompositeOperation = 'lighter';
			}

			for (var i = 0;i < n;++i) {
				var nextIndex = this.jobFinishedCount;
				this.renderOffscreen(g, nextIndex, anySelected, defaultColor, use_mkclr);
				//console.log(nextIndex)

				if (++this.jobFinishedCount <= plLastIndex) {
					shouldContinue = true;
				} else {
					break;
				}
			}
			g.restore();

			this.transferOffscreenImage();
			if (shouldContinue) {
				this.reserveJobNext();
			}
		},

		reserveJobNext: function(delay) {
			if (delay) {
				this.nextDelayStartJob = true;
			}

			if (!this.nowJobRunning) {
				this.nowJobRunning = true;
				setTimeout(this.consumeJobClosure, this.nextDelayStartJob ? 250 : 1);
				this.nextDelayStartJob = false;
			}
		},

		renderOffscreen: function(g, polylineIndex, selectedOnly, defaultColor, useMarkerColor) {
			var ds = this.dataSource;
			if (selectedOnly) {
				var objId = ds.tpGetOwnerObjectId(polylineIndex);
				if (!this.ownerMapType.isIDReffered(objId)) {
					return;
				}
			}
			
			var clr_mode = this.ownerMapType.getTrajectoryColoringMode();
			var speed_clr = (clr_mode === mobmap.MMExploreLayer.TrajectoryColoring.Speed);
//speed_clr=true;
			var wsize = Math.pow(2, this.currentZoom);

			var tw = this.tileSize.width;
			var th = this.tileSize.height;
			var tox = (this.canvasStatus.minCX * tw);
			var toy = (this.canvasStatus.minCY * th);
			//console.log(tox, toy)
			//var render_nodes = this.renderNodes;
			
			var rangeInfo = _shared_temp_TrajectoryRenderRangeData;
			this.fillTrajectoryRangeInfo(rangeInfo, ds, polylineIndex);
			// console.log("R:  ",rangeInfo);
			
			if (!speed_clr) {
				var markerBoundColor = null;
				if (useMarkerColor) {
					this.drawTrajectoryLinesMarkerColor(g, ds, polylineIndex, wsize, tox, toy, defaultColor);
				} else {
					this.drawTrajectoryLinesFixedColor(g, ds, polylineIndex, wsize, tox, toy, defaultColor);
				}
			} else {
				this.drawTrajectoryLinesSpeedColor(g, ds, polylineIndex, wsize, tox, toy);
			}
		},
		
		fillTrajectoryRangeInfo: function(rg, dataSource, polylineIndex) {
			rg.startIndex = -1;
			rg.endIndex = -1;
			
			var plen = dataSource.tpCountVerticesOfPolyline(polylineIndex);
			if (plen < 2) { return; }

			var trange = this.ownerMapType.timeRange;
			if (trange.start !== null) {
				var tS = trange.start;
				var tE = trange.end;
				
				var firstTimestamp = dataSource.tpGetVertexTimestamp(polylineIndex, 0);
				var lastTimestamp  = dataSource.tpGetVertexTimestamp(polylineIndex, plen-1);
				if (tS > lastTimestamp) {
					rg.startIndex = plen-1;
				}
				
				if (tE < firstTimestamp) {
					rg.endIndex = 0;
				}
				
				var nSegs = plen - 1;
				for (var i = 0;i < nSegs;++i) {
					var t1 = dataSource.tpGetVertexTimestamp(polylineIndex, i);
					var t2 = dataSource.tpGetVertexTimestamp(polylineIndex, i+1);
					var tlen = t2 - t1;
					if (tlen === 0) { tlen = 1; }
					
					if (tS >= t1 && tS < t2) {
						var ratS = (tS - t1) / tlen;
						rg.startIndex = i + ratS;
					}
					
					if (tE >= t1 && tE < t2) {
						var ratE = (tE - t1) / tlen;
						rg.endIndex = i + ratE;
					}
				}
			}
		},
		
		drawTrajectoryLinesFixedColor: function(g, ds, polylineIndex, wsize, tox, toy, defaultColor) {
			var rangeInfo = _shared_temp_TrajectoryRenderRangeData;
			var len = ds.tpCountVerticesOfPolyline(polylineIndex);
			var pj = this.ownerMap.getProjection();
			
			var startIndex = Math.max(Math.floor(rangeInfo.startIndex), 0);
			var startHalfSegmentIndex = Math.floor(rangeInfo.startIndex);
			var endIndex = (rangeInfo.endIndex >= 0) ? Math.ceil(rangeInfo.endIndex) : len;
			
			g.strokeStyle = defaultColor || this.defaultStrokeStyle;
			g.beginPath();
			for (var i = startIndex;i < endIndex;++i) {
				var lat = ds.tpGetVertexLatitude(polylineIndex, i);
				var lng = ds.tpGetVertexLongitude(polylineIndex, i);
				var lat1 = lat;
				var lng1 = lng;
				if (startHalfSegmentIndex === i) {
					var lat2s = ds.tpGetVertexLatitude(polylineIndex, i+1);
					var lng2s = ds.tpGetVertexLongitude(polylineIndex, i+1);
					if (lat2s !== null) {
						lat = calcSegmentMidPoint(rangeInfo.startIndex, lat, lat2s);
						lng = calcSegmentMidPoint(rangeInfo.startIndex, lng, lng2s);
					}
				}

				var wPos = pj.fromLatLngToPoint( new google.maps.LatLng(lat, lng) );
				var sx = wPos.x * wsize - tox;
				var sy = wPos.y * wsize - toy;

				if (i === 0) {
					g.moveTo(sx, sy);
				} else {
					g.lineTo(sx, sy);
				}
				
				if (i === (endIndex - 1)) {
					this.strokeEndMidPoint(g, tox, toy, wsize, pj, ds, polylineIndex, i+1, lat1, lng1, rangeInfo.endIndex);
				}

/*
				if (render_nodes) {
					g.fillRect(sx-1, sy-1, 3, 3);
				}
*/
			}

			g.stroke();
		},
		
		drawTrajectoryLinesMarkerColor: function(g, ds, polylineIndex, wsize, tox, toy, defaultColor) {
			var rangeInfo = _shared_temp_TrajectoryRenderRangeData;
			var len = ds.tpCountVerticesOfPolyline(polylineIndex);
			var pj = this.ownerMap.getProjection();
			if (len < 2) {return;}

			var prevColor = null;
			g.beginPath();
			var vcount = 0;

			var startIndex = Math.max(Math.floor(rangeInfo.startIndex), 0);
			var startHalfSegmentIndex = Math.floor(rangeInfo.startIndex);
			var endIndex = (rangeInfo.endIndex >= 0) ? Math.ceil(rangeInfo.endIndex) : len;

			for (var i = startIndex;i < endIndex;++i) {
				var lat = ds.tpGetVertexLatitude(polylineIndex, i);
				var lng = ds.tpGetVertexLongitude(polylineIndex, i);
				var lat1 = lat;
				var lng1 = lng;
				var newColor = ds.tpGetMarkerBoundColor( ds.tpGetOwnerObjectId(polylineIndex), i );

				if (startHalfSegmentIndex === i) {
					var lat2s = ds.tpGetVertexLatitude(polylineIndex, i+1);
					var lng2s = ds.tpGetVertexLongitude(polylineIndex, i+1);
					if (lat2s !== null) {
						lat = calcSegmentMidPoint(rangeInfo.startIndex, lat, lat2s);
						lng = calcSegmentMidPoint(rangeInfo.startIndex, lng, lng2s);
					}
				}

				// Projection - - - - -
				var wPos = pj.fromLatLngToPoint( new google.maps.LatLng(lat, lng) );
				var sx = wPos.x * wsize - tox;
				var sy = wPos.y * wsize - toy;

				if (!prevColor || !prevColor.equals(newColor)) {
					if (i) {
						g.lineTo(sx, sy);
						g.stroke();
						g.beginPath();
					}
					
					vcount = 0;
					g.strokeStyle = newColor.toHTMLRGB();
				}


				if (vcount === 0) {
					g.moveTo(sx, sy);
				} else {
					g.lineTo(sx, sy);
				}

				if (i === (endIndex - 1)) {
					if (this.strokeEndMidPoint(g, tox, toy, wsize, pj, ds, polylineIndex, i+1, lat1, lng1, rangeInfo.endIndex)) {
						++vcount;
					}
				}

				++vcount;
			}
			
			if (vcount > 1) {
				g.lineTo(sx, sy);
				g.stroke();
			}
		},
		
		strokeEndMidPoint: function(g, tox, toy, wsize, projection, dataSource, polylineIndex, nextVertexIndex, lat1, lng1, endFloatIndex) {
			var lat2e = dataSource.tpGetVertexLatitude(polylineIndex, nextVertexIndex);
			var lng2e = dataSource.tpGetVertexLongitude(polylineIndex, nextVertexIndex);
			if (lat2e !== null) {
				var mlat = calcSegmentMidPoint(endFloatIndex, lat1, lat2e);
				var mlng = calcSegmentMidPoint(endFloatIndex, lng1, lng2e);
				var wPos = projection.fromLatLngToPoint( new google.maps.LatLng(mlat, mlng) );
				var sx = wPos.x * wsize - tox;
				var sy = wPos.y * wsize - toy;
				g.lineTo(sx, sy);
				return true;
			}

			return false;
		},

		drawTrajectoryLinesSpeedColor: function(g, ds, polylineIndex, wsize, tox, toy) {
			var len = ds.tpCountVerticesOfPolyline(polylineIndex);
			var pj = this.ownerMap.getProjection();
			if (len < 2) {return;}
			
			var nSegments = len - 1;
			var prevLat = ds.tpGetVertexLatitude(polylineIndex, 0);
			var prevLng = ds.tpGetVertexLongitude(polylineIndex, 0);
			var prevTime = ds.tpGetVertexTimestamp(polylineIndex, 0);

			var wPos = pj.fromLatLngToPoint( new google.maps.LatLng(lat, lng) );
			var sx = wPos.x * wsize - tox;
			var sy = wPos.y * wsize - toy;
			var prevSX = sx;
			var prevSY = sy;
			
			for (var i = 0;i < nSegments;++i) {
				var lat = ds.tpGetVertexLatitude(polylineIndex, i+1);
				var lng = ds.tpGetVertexLongitude(polylineIndex, i+1);
				var time = ds.tpGetVertexTimestamp(polylineIndex, i+1);
				var dTime = time - prevTime;
				var dMeter = calcDistanceFromLatLng(lng, lat, prevLng, prevLat);
				var velo = 0;
				var colorComponent = 0;
				if (dTime > 0.1) {
					velo = dMeter / dTime;
//					colorComponent = Math.floor(velo * 10.0);
					colorComponent = Math.floor(velo * 40.0);
					if (colorComponent > 255) { colorComponent = 255; }
				}
				
				wPos = pj.fromLatLngToPoint( new google.maps.LatLng(lat, lng) );
				sx = wPos.x * wsize - tox;
				sy = wPos.y * wsize - toy;
				
//				g.strokeStyle = 'rgb('+ colorComponent +',0,255)';
				g.strokeStyle = 'rgba(10,30,200,' +((255-colorComponent)/255.0)+ ')';
				g.beginPath();
				g.moveTo(prevSX, prevSY);
				g.lineTo(sx, sy);
				g.stroke();

				prevLat = lat;
				prevLng = lng;
				prevTime = time;
				prevSX = sx;
				prevSY = sy;
			}
		},
		
		transferOffscreenImage: function(force) {
			if (!this.currentVisibility) { return; }

			var tw = this.tileSize.width;
			var th = this.tileSize.height;
			var ox = this.canvasStatus.minCX;
			var oy = this.canvasStatus.minCY;
			var sourceImage = this.canvas;

			var m = this.tileKeyMap;
			for (var k in m) if (m.hasOwnProperty(k)) {
				var tileObject = m[k];
				var lastRenderedPolylineIndex = this.jobFinishedCount - 1;
				if (!force && tileObject._lastRenderedIndex > lastRenderedPolylineIndex) {
					continue;
				}

				var cx = tileObject._cx;
				var cy = tileObject._cy;
				var g = tileObject.getContext('2d');
				g.clearRect(0, 0, tw, th);

				var rx = cx - ox;
				var ry = cy - oy;
				if (rx < 0 || ry < 0) {
					continue;
				}

				tileObject._lastRenderedIndex = lastRenderedPolylineIndex;
				g.drawImage(sourceImage, rx*tw, ry*th, tw, th, 0, 0, tw, th);

			}
		},
		
		transferVisibleDirtyTiles: function() {
			if (!this.currentVisibility) { return; }

			var mapBounds = this.ownerMap.getBounds();
			var minLat = mapBounds.getSouthWest().lat();
			var minLng = mapBounds.getSouthWest().lng();
			var maxLat = mapBounds.getNorthEast().lat();
			var maxLng = mapBounds.getNorthEast().lng();
			
			var tw = this.tileSize.width;
			var th = this.tileSize.height;
			var ox = this.canvasStatus.minCX;
			var oy = this.canvasStatus.minCY;
			var sourceImage = this.canvas;
			var sourceG = sourceImage.getContext('2d');

			var m = this.tileKeyMap;
			for (var k in m) if (m.hasOwnProperty(k)) {
				var tileObject = m[k];
				
				if (tileObject._max_lat < minLat ||
					tileObject._min_lat > maxLat ||
					tileObject._max_lng < minLng ||
					tileObject._min_lng > maxLng) {
						continue;
				}

				var cx = tileObject._cx;
				var cy = tileObject._cy;
				var g = tileObject.getContext('2d');

				var rx = cx - ox;
				var ry = cy - oy;
				
				if (rx < 0 || ry < 0) {
					continue;
				}

				if (!this.dirtyMap[makeDirtyMapKey(rx, ry)]) {
					g.clearRect(0, 0, tw, th);
					continue;
				}

				g.save();
				g.globalCompositeOperation = 'copy';
				g.drawImage(sourceImage, rx*tw, ry*th, tw, th, 0, 0, tw, th);
				g.restore();
			}
		},

		transferOneTile: function(tileObject) {
			if (!this.currentVisibility) { return; }
			
			var tw = this.tileSize.width;
			var th = this.tileSize.height;
			var ox = this.canvasStatus.minCX;
			var oy = this.canvasStatus.minCY;
			var sourceImage = this.canvas;

			var cx = tileObject._cx;
			var cy = tileObject._cy;
			var g = tileObject.getContext('2d');
			g.clearRect(0, 0, tw, th);

			var rx = cx - ox;
			var ry = cy - oy;
			if (rx < 0 || ry < 0) {
				return;
			}

			tileObject._lastRenderedIndex = this.jobFinishedCount - 1;
			g.drawImage(sourceImage, rx*tw, ry*th, tw, th, 0, 0, tw, th);
		},
		
		renderOffscreenMarching: function(objIDlist) {
			this.clearDirtyMap();
			var cs = this.canvasStatus;
			var g = this.canvas.getContext('2d');
			g.clearRect(0, 0, cs.width, cs.height);
			
			var n = objIDlist.length;
			for (var i = 0;i < n;++i) {
				this.renderOffscreenMarchingOfObjectID(g, objIDlist[i]);
			}
			
			this.transferVisibleDirtyTiles();
		},
		
		renderOffscreenMarchingOfObjectID: function(g, objId) {
			var currentT = (new Date()) - 0;
			var ds = this.dataSource;
			if (!ds) { return; }
			
			var mdat = ds.movingData;

			var tl = mdat.getTimeListOfId(objId);
			if (!tl) { return; }
			
			var reclist = tl.getRecordList();
			if (reclist.length < 2) { return; }
			
			var firstRec = reclist[0];
			var firstTime = firstRec._time;
			var lastRec = reclist[ reclist.length - 1 ];
			
			var timeLen = lastRec._time - firstTime;

			// map states
			var tw = this.tileSize.width;
			var th = this.tileSize.height;
			var tox = (this.canvasStatus.minCX * tw);
			var toy = (this.canvasStatus.minCY * th);
			var pj = this.ownerMap.getProjection();
			var wsize = Math.pow(2, this.currentZoom);
			
			var tempRec = this.tempPickRecord;
			
			var nAnts = Math.floor(timeLen / 1000);
			for (var i = 0;i < nAnts;++i) {
				var offsetT = ((currentT % timeLen) + Math.floor((i/nAnts) * timeLen)) % timeLen;
				
				mdat.pickById(tempRec, firstTime + offsetT, objId);
				var lat1 = tempRec.y;
				var lng1 = tempRec.x;
				var wPos = pj.fromLatLngToPoint( new google.maps.LatLng(tempRec.y, tempRec.x) );
				var sx = wPos.x * wsize - tox;
				var sy = wPos.y * wsize - toy;
				
				mdat.pickById(tempRec, firstTime + offsetT + 1, objId);
				var lat2 = tempRec.y;
				var lng2 = tempRec.x;
				
				this.markDirtyAround(sx, sy);
	
				this.drawMarchingMarker(g, sx, sy, lng2-lng1, lat2-lat1);
			}
		},
		
		drawMarchingMarker: function(g, sx, sy, dx, dy) {
			var angle = -99;
			if (Math.abs(dx) >= 0.0000001 || Math.abs(dy) >= 0.0000001) {
				angle = Math.atan2(-dy, dx);
			}
			
			g.save();
			g.fillStyle = '#abf';
			if (angle < -9) {
				g.beginPath();
				g.arc(sx, sy, 4, 0, Math.PI*2, false);
				g.fill();
			} else {
				g.translate(sx, sy);
				g.rotate(angle);
				g.beginPath();
				g.moveTo(2, 0);
				g.lineTo(-5, 3);
				g.lineTo(-3, 0);
				g.lineTo(-5, -3);
				g.fill();
			}
			g.restore();
		},
		
		markDirtyAround: function(sx, sy) {
			this.markDirtyFromCanvasPos(sx - 8, sy - 8);
			this.markDirtyFromCanvasPos(sx + 8, sy - 8);
			this.markDirtyFromCanvasPos(sx - 8, sy + 8);
			this.markDirtyFromCanvasPos(sx + 8, sy + 8);
		},
		
		markDirtyFromCanvasPos: function(x, y) {
			var tx = Math.floor(x / this.tileSize.width);
			var ty = Math.floor(y / this.tileSize.height);
			if (tx < 0 || ty < 0) { return; }
			
			this.dirtyMap[ makeDirtyMapKey(tx, ty) ] = true;
		},
		
		clearDirtyMap: function() {
			var m = this.dirtyMap;
			for (var i in m) if (m.hasOwnProperty(i)) {
				delete m[i];
			}
		}
	}



	// -- Utilities
	var _shared_temp_TrajectoryRenderRangeData = {
		startIndex: -1,
		endIndex: -1
	};

	function calcSegmentMidPoint(indexAndRatio, val1, val2) {
		var t = indexAndRatio - Math.floor(indexAndRatio);
		var _t = 1.0 - t;
		
		return val1 * _t + val2 * t;
	}

	function setCanvasSize(el, w, h) {
		var s = el.style;
		s.width = Math.floor(w) + 'px';
		s.height = Math.floor(h) + 'px';
		
		el.width = Math.floor(w);
		el.height = Math.floor(h);
	}
	
	var PolylineDatasourceMethods = [
		'tpCountPolylines',
		'tpCountVerticesOfPolyline',
		'tpGetOwnerObjectId'
	];
	
	function checkPolylineDatasourceImplementation(obj) {
		for (var i in PolylineDatasourceMethods) {
			var name = PolylineDatasourceMethods[i];
			if (! obj[name] ) {
				throw "Datasource object must implement " + name;
			}
		}
	}
	
	function makeDirtyMapKey(x, y) {
		return y * 1000 + x;
	}

	aGlobal.mobmap.ExploreMapType = ExploreMapType;
})(window);