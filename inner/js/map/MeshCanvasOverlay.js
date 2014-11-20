if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var _tempProjPt = {lat:0,lng:0,screenX:0,screenY:0} ;
	
	function installMeshOverlay(pkg) {
		function MeshCanvasOverlay() {
			this.canvas = null;
			this.g = null;
			this.cachedDiv = null;
			this.jCachedDiv = null;
			this.boundData = null;
			this.pickTime = 0;
			
			// Default values
			this.visible = true;
			this.statChartEnabled = false;
			this.useDynStatValueForColoring = false;
			this.generatedListeners = [];
			this.targetPane = 'overlayLayer';
			this.canvasOffset = {x: 0, y:0};
			this.canvasSize = {w: 0, h:0};
			this.prevRenderRegion = {minLat:-1, maxLat:-1, minLng:-1, maxLng:-1};
			
			this.ownerObject = null;
			this.projectionGrid = new mobmap.FastProjectionGrid(9);
			
			this.renderValueMax = 10000;
			this.colorList = null;
			this.valueLabelEnabled = false;
			this.cellSpacing = 0;
		}
		
		// Inherit
		MeshCanvasOverlay.prototype = new google.maps.OverlayView();

		MeshCanvasOverlay.prototype.setVisibility = mobmap.GLMobLayer.overlaybase_setVisibility;

		MeshCanvasOverlay.prototype.bindData = function(meshData) {
			this.boundData = meshData;
			this.render();
		};

		MeshCanvasOverlay.prototype.setPickTime = function(t) {
			this.pickTime = t;
		};
		
		MeshCanvasOverlay.prototype.setRenderValueMax = function(vmax) {
			this.renderValueMax = vmax;
		};

		MeshCanvasOverlay.prototype.setColorList = function(cl) {
			this.colorList = cl;
		};

		MeshCanvasOverlay.prototype.setValueLabelEnabled = function(e) {
			this.valueLabelEnabled = e;
		};

		MeshCanvasOverlay.prototype.setCellSpacing = function(s) {
			this.cellSpacing = s;
		};
		
		MeshCanvasOverlay.prototype.draw = function() {
			if (!this.canvas) {
				this.canvas = $H('canvas');
				// this.canvas.style.backgroundColor = "rgba(255,0,0,0.2)";
				this.g = this.canvas.getContext('2d');

				var panes = this.getPanes();
				panes[this.targetPane].appendChild( this.canvas );
				
				mobmap.GLMobLayer.setupOverlayMapEvents(this);
			}
			this.locateCanvas();
		};

		MeshCanvasOverlay.prototype.willRemove = function() {
			mobmap.GLMobLayer.clearOverlayMapEvents(this);
		};
		
		MeshCanvasOverlay.prototype.onRemove = function() {
			this.canvas.parentNode.removeChild(this.canvas);
		};
		
		MeshCanvasOverlay.prototype.locateCanvas = function() {
			var d = this.getJQDiv();
			var cv = this.canvas;

			var should_resize = mobmap.GLMobLayer.calcOverlayCanvasSize(this.canvasSize, d);
			if (should_resize) {
				this.changeCanvasSize(this.canvasSize.w , this.canvasSize.h);
			}
			
			mobmap.GLMobLayer.adjustOverlayCanvasPosition(this, this.canvasOffset);
			this.render();
		};
		
		MeshCanvasOverlay.prototype.render = function() {
			var use_label = this.valueLabelEnabled;
			var spacing = this.cellSpacing;
			var size_reduce = spacing << 1;
			var nDrawnCells = 0;
			var g = this.g;
			var md = this.boundData;
			if (!md || !g) { return; }
			
			if (!this.updateProjectionGrid(this.projectionGrid)) {
				return;
			}

			md.updateDynStat(this.pickTime);
			var use_dynstat = md.isDynStatEnabled();
			var use_chart = this.statChartEnabled;
			
			// Map bounds  - -
			var mbnd = this.getMap().getBounds();
			var mapNE = mbnd.getNorthEast();
			var mapSW = mbnd.getSouthWest();

			var mapMinLng = mapSW.lng();
			var mapMaxLng = mapNE.lng();
			var mapMinLat = mapSW.lat();
			var mapMaxLat = mapNE.lat();
			// - - - - - - - -
			
			var nX = (md.indexRange.maxX - md.indexRange.minX) + 1;
			var nY = (md.indexRange.maxY - md.indexRange.minY) + 1;

			var sx = md.indexRange.minX;
			var sy = md.indexRange.minY;
			
			var o_lng = md.meshDefinition.originLng;
			var o_lat = md.meshDefinition.originLat;
			var dlng = md.meshDefinition.stepLng;
			var dlat = md.meshDefinition.stepLat;
			var pt = _tempProjPt;

			g.clearRect(0,0, this.canvasSize.w, this.canvasSize.h);
			if (!this.visible) { return; }
			
			var dyn_clr = use_dynstat && this.useDynStatValueForColoring;
			var oldSY = null;
			for (var y = sy;y < (sy+nY);++y) {

				var oldSX= null;
				for (var x = sx;x < (sx+nX);++x) {
					var sx1, sy1;
					if (oldSX === null || oldSY === null) {
						pt.lat = o_lat + y * dlat;
						pt.lng = o_lng + x * dlng;

						this.projectionGrid.calc(pt);
						sx1 = Math.floor(pt.screenX);
						sy1 = Math.floor(pt.screenY);
					} else {
						sx1 = oldSX;
						sy1 = oldSY;
					}

					pt.lat = o_lat + (y + 1) * dlat;
					pt.lng = o_lng + (x + 1) * dlng;
					if ((pt.lat - dlat) > mapMaxLat) { break; }
					if ((pt.lng - dlng) > mapMaxLng) {
						--nX;
						break;
					}
					
					this.projectionGrid.calc(pt);
					var sx2 = Math.floor(pt.screenX);
					var sy2 = Math.floor(pt.screenY);
					
					oldSX = sx2;
					if (x === (nX-1)) {
						oldSY = sy2;
					}

					if (pt.lat < mapMinLat) { break; }
					if (pt.lng < mapMinLng) {
						++sx;
						continue;
					}

					// Skip an empty row. But first column sould NOT be skipped to update oldSY.
					// So break here.
					if (!md.hasRowAnyData(y)) {
						break;
					}

					// Render a cell
					var cellVal = md.pick(y, x, this.pickTime);
					if (cellVal) {
						var cellColor = this.mapValueToCellColor(dyn_clr ? cellVal.statVal : cellVal.val);
						g.fillStyle = cellColor;
					
						var cellWidth = sx2 - sx1;
						var cellHeight = sy1 - sy2;
						if (cellWidth >= size_reduce && cellHeight >= size_reduce) {
							g.fillRect(sx1 + spacing, sy2 + spacing, cellWidth - size_reduce, cellHeight - size_reduce);
						
							if (use_dynstat && use_chart && cellHeight >= 32 && cellWidth >= 32) {
								var statRatio = cellVal.statVal / cellVal.val;
								if (isFinite(statRatio)) {
									var pieR = (Math.min(cellWidth, cellHeight) - 14) >> 1;
									g.save();
									g.translate(sx1 + (cellWidth>>1), sy2 + (cellHeight>>1));
									MeshCanvasOverlay.drawCircleChart(g, pieR, statRatio);
									g.restore();
								}
							}

							if (use_label) {
								if (use_dynstat) {
									this.renderCellLabel(g, sx1, sy2 - 13, cellWidth, cellHeight, cellVal.statVal, 13);
								}

								this.renderCellLabel(g, sx1, sy2, cellWidth, cellHeight, cellVal.val);
							}

							++nDrawnCells;
						}
	//					g.clearRect(sx1+1, sy2+1, (sx2-sx1)-2, (sy1-sy2)-2);
					}
				}
			} // y loop
			
			// console.log("N:",nDrawnCells);
		};

		MeshCanvasOverlay.prototype.renderCellLabel = function(g, cellOriginX, cellOriginY, cellWidth, cellHeight, value, h_margin) {
			g.save();
			g.font = '10px sans-serif';
			var labelText = value.toString();
			var m = g.measureText(labelText);
			var requireH = h_margin ? (11 + h_margin) : 11;
			if (m.width < (cellWidth - 5) && requireH < cellHeight) {
				g.fillStyle = "#fff";
				g.shadowOffsetX = 0;
				g.shadowOffsetY = 1;
				g.shadowBlur = 1;
				g.shadowColor = "#000";
			
				g.fillText(labelText, cellOriginX + 2, cellOriginY + cellHeight - 4);
			}
			
			g.restore();
		};
		
		MeshCanvasOverlay.prototype.mapValueToCellColor = function(val) {
			if (isNaN(val)) {
				return 'rgba(0,0,0,0)';
			}
			
			var a = val / this.renderValueMax;
			if (this.colorList) {
				return this.colorList.getColor(a);
			}
			
			var components = [255, 0, 0, 1];
			if (a < 0) {a=0;} else if (a > 1) {a=1;}
			components[3] = a;
			return "rgba(" + components.join(',') + ")";
		};

		MeshCanvasOverlay.prototype.getJQDiv = mobmap.GLMobLayer.overlaybase_getCechedJQueryDiv;
		MeshCanvasOverlay.prototype.changeCanvasSize = mobmap.GLMobLayer.overlaybase_changeCanvasSize;
		MeshCanvasOverlay.prototype.updateProjectionGrid = mobmap.GLMobLayer.overlaybase_updateProjectionGrid;

		// Map event handlers --------------------------------------
		MeshCanvasOverlay.prototype.onMapZoomChanged = function() {
		};

		MeshCanvasOverlay.prototype.onMapZoomDragged = function() {
			this.locateCanvas();
		};

		MeshCanvasOverlay.prototype.onMapSized = function() {
			this.locateCanvas();
		};

		MeshCanvasOverlay.prototype.onMapCenterChanged = function() {
			this.locateCanvas();
		};

		MeshCanvasOverlay.prototype.resetRenderedRegion = mobmap.GLMobLayer.overlaybase_resetRenderedRegion;
		MeshCanvasOverlay.prototype.updateRenderedRegion = mobmap.GLMobLayer.overlaybase_updateRenderedRegion;
		MeshCanvasOverlay.prototype.isRenderedRegionChanged = mobmap.GLMobLayer.overlaybase_isRenderedRegionChanged;
		
		
		MeshCanvasOverlay.drawCircleChart = function(g, radius, ratio) {
			var DPI = Math.PI * 2.0;
			var HPI = Math.PI / 2.0;
			var a1 = Math.min(DPI, ratio * DPI);
			var fsize = radius >> 1;
			
			g.save();

			g.fillStyle = "rgba(0,0,0,0.4)";
			g.beginPath();
			g.arc(0, 0, radius + 3, 0, DPI, false);
			g.fill();
			g.beginPath();

			g.strokeStyle = "rgba(255,255,255,0.6)";
			g.lineWidth = 4;
			g.beginPath();
			g.lineCap = "butt";
			g.arc(0, 0, radius, -HPI, a1 - HPI, false);
			g.stroke();
			
			if (ratio > 1.0) {
				var a2 = Math.min(DPI, (ratio - 1.0) * DPI);
				g.strokeStyle = "rgba(255,255,255,0.9)";
				g.lineWidth = 4;
				g.beginPath();
				g.lineCap = "butt";
				g.arc(0, 0, radius-2, -HPI, a2 - HPI, false);
				g.stroke();
			}

			g.font = fsize + "px sans-serif";
			g.textBaseline = "middle";
			g.fillStyle = "#000";
			g.textAlign = "center";
			g.fillText(Math.floor(ratio * 100) + '%', 0, 2);
			
			g.fillStyle = "#fff";
			g.textAlign = "center";
			g.fillText(Math.floor(ratio * 100) + '%', 0, 1);
			
			g.restore();
		};
		

		pkg.MeshCanvasOverlay = MeshCanvasOverlay;
	}
	
	if (window.ENABLE_MOBMAP_LAZY_LOAD) {
		window.mobmap.installMeshOverlay = function() { installMeshOverlay(window.mobmap); };
	} else {
		installMeshOverlay(window.mobmap);
	}

})(window);