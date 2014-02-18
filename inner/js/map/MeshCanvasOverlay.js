if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function installMeshOverlay(pkg) {
		function MeshCanvasOverlay() {
			this.canvas = null;
			this.cachedDiv = null;
			this.jCachedDiv = null;
			
			// Default values
			this.targetPane = 'overlayShadow';
			this.canvasOffset = {x: 0, y:0};
			this.canvasSize = {w: 0, h:0};
		}
		
		// Inherit
		MeshCanvasOverlay.prototype = new google.maps.OverlayView();

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
		};
		
		MeshCanvasOverlay.prototype.getJQDiv = mobmap.GLMobLayer.overlaybase_getCechedJQueryDiv;
		MeshCanvasOverlay.prototype.changeCanvasSize = mobmap.GLMobLayer.overlaybase_changeCanvasSize;

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