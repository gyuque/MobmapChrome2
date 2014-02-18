if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var _tempProjPt = {lat:0,lng:0,screenX:0,screenY:0} ;
	
	function installMeshOverlay(pkg) {
		function MeshCanvasOverlay() {
			this.canvas = null;
			this.cachedDiv = null;
			this.jCachedDiv = null;
			this.boundData = null;
			
			// Default values
			this.targetPane = 'overlayShadow';
			this.canvasOffset = {x: 0, y:0};
			this.canvasSize = {w: 0, h:0};
			
			this.projectionGrid = new mobmap.FastProjectionGrid(9);
		}
		
		// Inherit
		MeshCanvasOverlay.prototype = new google.maps.OverlayView();

		MeshCanvasOverlay.prototype.bindData = function(meshData) {
			this.boundData = meshData;
			this.render();
		};

		MeshCanvasOverlay.prototype.draw = function() {
			if (!this.canvas) {
				this.canvas = $H('canvas');
				this.canvas.style.backgroundColor = "rgba(255,0,0,0.4)";

				var panes = this.getPanes();
				panes[this.targetPane].appendChild( this.canvas );
				
				mobmap.GLMobLayer.setupOverlayMapEvents(this);
			}
			this.locateCanvas();
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
			var md = this.boundData;
			if (!md) { return; }
			
			if (!this.updateProjectionGrid(this.projectionGrid)) {
				return;
			}
			
			var nX = (md.indexRange.maxX - md.indexRange.minX) + 1;
			var nY = (md.indexRange.maxY - md.indexRange.minY) + 1;
			
			var sx = md.indexRange.minX;
			var sy = md.indexRange.minY;
			
			var o_lng = md.meshDefinition.originLng;
			var o_lat = md.meshDefinition.originLat;
			var dlng = md.meshDefinition.stepLng;
			var dlat = md.meshDefinition.stepLat;
			var pt = _tempProjPt;
			
			for (var y = sy;y < nY;++y) {
				for (var x = sx;x < nX;++x) {
					var lat = o_lat + y * dlat;
					var lng = o_lng + x * dlng;

					this.projectionGrid.calc(pt);
				}
			}
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


		pkg.MeshCanvasOverlay = MeshCanvasOverlay;
	}
	
	if (window.ENABLE_MOBMAP_LAZY_LOAD) {
		window.mobmap.installMeshOverlay = function() { installMeshOverlay(window.mobmap); };
	} else {
		installMeshOverlay(window.mobmap);
	}

})(window);