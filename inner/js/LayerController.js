if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function LayerController(ownerApp) {
		this.ownerApp = ownerApp;
		this.mapOverlayList = [];
	}
	
	LayerController.prototype = {
		observeProject: function(prj) {
			prj.eventDispatcher().
			 bind(
				mobmap.MMProject.LAYERLIST_CHANGE,
				this.onProjectLayerlistChange.bind(this)
			 );
			
			this.checkLayerList(prj);
		},
		
		onProjectLayerlistChange: function(e, senderProject) {
			this.checkLayerList(senderProject);
		},
		
		checkLayerList: function(prj) {
			var ll = prj.layerList;
			var len = ll.getCount();
			
			for (var i = 0;i < len;++i) {
				var lyr = ll.getLayerAt(i);
				var mapOverlay = this.findMapOverlayFor(lyr);
				if (!mapOverlay) {
					// Create and connect map overlay
					mapOverlay = new mobmap.GLMobLayer();
					var mapPane = this.ownerApp.getMapPane();
					var gmap = mapPane.getGoogleMaps();
					mapOverlay.markerPoolStack.createPoolOnTop();
					
					mapOverlay.setMap(gmap);
					mapOverlay.ownerObject = lyr;
					this.mapOverlayList.push(mapOverlay);
				}
			}
		},
		
		findMapOverlayFor: function(layerModel) {
			var ls = this.mapOverlayList;
			var len = ls.length;
			
			for (var i = 0;i < len;++i) {
				if (ls[i].ownerObject === layerModel) {
					return ls[i];
				}
			}
			
			return null;
		},
		
		observeMapPane: function(mapPane) {
			mapPane.eventDispatcher().bind(mobmap.MapPane.NEED_OVERLAYS_RENDER_EVENT, this.onMapPaneNeedsOverlaysRender.bind(this));
		},
		
		onMapPaneNeedsOverlaysRender: function(e, senderMapPane, targetTimeSec) {
			var ls = this.mapOverlayList;
			var len = ls.length;
			
			for (var i = 0;i < len;++i) {
				var overlay = ls[i];
				var layer   = ls[i].ownerObject;
				
				if (layer.shouldRenderAsPoints) {
					this.fillMarkerPool(overlay, layer, targetTimeSec);
				}
			}
		},
		
		fillMarkerPool: function(overlay, sourceLayer, targetTimeSec) {
			if (!sourceLayer.dataReady) {return;}
			var markerPool = overlay.markerPoolStack.getAt(0);
			var movingData = sourceLayer.movingData;
			
			// Prepare pick pool (if not ready)
			if (!overlay._stockPickPool) {
				overlay._stockPickPool = movingData.createPickPool();
			}

			var pickPool = overlay._stockPickPool;
			pickPool.clear();
			movingData.pickAt(pickPool, targetTimeSec);
			var count = pickPool.pickedCount;
		}
	};

	aGlobal.mobmap.LayerController = LayerController;
})(window);