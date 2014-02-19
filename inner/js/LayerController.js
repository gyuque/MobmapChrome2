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
				this.observeLayerIfNot(lyr);
				
				var mapOverlay = this.findMapOverlayFor(lyr);
				if (!mapOverlay) {
					// Create and connect map overlay
					mapOverlay = this.createNewOverlayForLayer(lyr);
				}
			}
		},


		// OVERLAY FACTORY ==============================

		createNewOverlayForLayer: function(lyr) {
			if (lyr.capabilities & mobmap.LayerCapability.MarkerRenderable) {
				return this.createMovingObjectsOverlay(lyr);
			} else {
				return this.createMeshOverlay(lyr);
			}
		},
		
		createMovingObjectsOverlay: function(lyr) {
			var mapOverlay = new mobmap.GLMobLayer();
			mapOverlay.canvasReadyCallback = this.onGLLayerReady.bind(this);
			var mapPane = this.ownerApp.getMapPane();
			var gmap = mapPane.getGoogleMaps();
			mapOverlay.preapareDefaultMarkerPool();
			
			mapOverlay.setMap(gmap);
			mapOverlay.ownerObject = lyr;
			this.mapOverlayList.push(mapOverlay);
			return mapOverlay;
		},

		createMeshOverlay: function(lyr) {
			var mapOverlay = new mobmap.MeshCanvasOverlay();
			var mapPane = this.ownerApp.getMapPane();
			var gmap = mapPane.getGoogleMaps();

			mapOverlay.setMap(gmap);
			mapOverlay.ownerObject = lyr;
			this.mapOverlayList.push(mapOverlay);
			return mapOverlay;
		},

		// ==============================================

		observeLayerIfNot: function(lyr) {
			if (lyr._lctrlObserved) {
				return false;
			}

			lyr._lctrlObserved = true;
			lyr.eventDispatcher().
			 bind(mobmap.LayerEvent.LoadFinish, this.onLayerLoadFinish.bind(this)).
			 bind(mobmap.LayerEvent.RequestDelete, this.onLayerRequestDelete.bind(this));

			return true;
		},
		
		onLayerLoadFinish: function(e, sourceLayer) {
			var ov = this.findMapOverlayFor(sourceLayer);
			if (ov && sourceLayer.bindOverlay) {
				sourceLayer.bindOverlay(ov);
			}
			
			if (this.ownerApp) { this.ownerApp.redrawMap();}
		},
		
		onLayerRequestDelete: function(e, sourceLayer) {
			if (this.ownerApp) {
				this.ownerApp.confirmLayerDelete(sourceLayer);
			}
		},
		
		onGLLayerReady: function() {
			if (this.ownerApp) { this.ownerApp.redrawMap();}
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
				} else if (overlay.setPickTime) {
					overlay.setPickTime(targetTimeSec);
					overlay.render();
				}
			}
		},
		
		fillMarkerPool: function(overlay, sourceLayer, targetTimeSec) {
			if (!sourceLayer.dataReady) {return;}

			var movingData = sourceLayer.movingData;
			var mk_pool = overlay.getTopMarkerPool();
			mk_pool.clear();
			
			this.applyGeneratedMarkerOfLayer(overlay, sourceLayer);
			
			// Prepare pick pool (if not ready)
			if (!overlay._stockPickPool) {
				overlay._stockPickPool = movingData.createPickPool();
			}

			var pickPool = overlay._stockPickPool;
			pickPool.clear();
			movingData.pickAt(pickPool, targetTimeSec);
			var count = pickPool.pickedCount;
			
			// console.log(count + " points on layer");

			mk_pool.begin(count);
			var src_array = pickPool.getArray();
			var m_array = mk_pool.getArray();
			for (var i = 0;i < count;++i) {
				var sourceRecord = src_array[i];
				
				m_array[i].lat = sourceRecord.y;
				m_array[i].lng = sourceRecord.x;
			}
			
			overlay.renderGL();
		},
	
		applyGeneratedMarkerOfLayer: function(targetLayer, layer) {
			var mg = layer.markerGenerator;
			if (!mg.dirty) {
				return;
			}
			
			var textureSourceImage = mg.resultCanvas;
			if (targetLayer.setMarkerImage(textureSourceImage)) { // Success?
				mg.dirty = false;
			}
		},
		
		getTopLayerOverlay: function() {
			var ls = this.mapOverlayList;
			var len = ls.length;
			if (len < 1) { return null; }

			return ls[len - 1];
		}
	};

	aGlobal.mobmap.LayerController = LayerController;
})(window);