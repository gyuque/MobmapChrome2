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
			this.generatedListeners = [];
			this.targetPane = 'overlayShadow';
			this.canvasOffset = {x: 0, y:0};
			this.canvasSize = {w: 0, h:0};
			this.prevRenderRegion = {minLat:-1, maxLat:-1, minLng:-1, maxLng:-1};
			
			this.ownerObject = null;
			this.projectionGrid = new mobmap.FastProjectionGrid(9);
			
			this.renderValueMax = 10000;
		}
		
		// Inherit
		MeshCanvasOverlay.prototype = new google.maps.OverlayView();

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
			var nDrawnCells = 0;
			var g = this.g;
			var md = this.boundData;
			if (!md || !g) { return; }
			
			if (!this.updateProjectionGrid(this.projectionGrid)) {
				return;
			}
			
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
					if ((pt.lng - dlng) > mapMaxLng ||
					    (pt.lat - dlat) > mapMaxLat) { break; }
					
					this.projectionGrid.calc(pt);
					var sx2 = Math.floor(pt.screenX);
					var sy2 = Math.floor(pt.screenY);
					
					oldSX = sx2;
					if (x === (nX-1)) {
						oldSY = sy2;
					}

					if (pt.lng < mapMinLng || pt.lat < mapMinLat) { continue; }

					// Skip an empty row. But first column sould NOT be skipped to update oldSY.
					// So break here.
					if (!md.hasRowAnyData(y)) {
						break;
					}

					// Render a cell
					var cellVal = md.pick(y, x, this.pickTime);
					if (cellVal) {
						var cellColor = this.mapValueToCellColor(cellVal.val);
						g.fillStyle = cellColor;
					
						g.fillRect(sx1, sy2, (sx2-sx1), (sy1-sy2));
						++nDrawnCells;
	//					g.clearRect(sx1+1, sy2+1, (sx2-sx1)-2, (sy1-sy2)-2);
					}
				}
			} // y loop
			
			console.log("N:",nDrawnCells);
		};

		MeshCanvasOverlay.prototype.mapValueToCellColor = function(val) {
			var components = [255, 0, 0, 1];
			var a = val / this.renderValueMax;
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

		pkg.MeshCanvasOverlay = MeshCanvasOverlay;
	}
	
	if (window.ENABLE_MOBMAP_LAZY_LOAD) {
		window.mobmap.installMeshOverlay = function() { installMeshOverlay(window.mobmap); };
	} else {
		installMeshOverlay(window.mobmap);
	}

})(window);