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
			}
			this.locateCanvas();
		};
		
		MeshCanvasOverlay.prototype.locateCanvas = function() {
			
		};
		
		MeshCanvasOverlay.prototype.getJQDiv = mobmap.GLMobLayer.overlaybase_getCechedJQueryDiv;

		pkg.MeshCanvasOverlay = MeshCanvasOverlay;
	}
	
	if (window.ENABLE_MOBMAP_LAZY_LOAD) {
		window.mobmap.installMeshOverlay = function() { installMeshOverlay(window.mobmap); };
	} else {
		installMeshOverlay(window.mobmap);
	}

})(window);