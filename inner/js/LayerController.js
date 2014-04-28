if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function LayerController(ownerApp) {
		this.ownerApp = ownerApp;
		this.mapOverlayList = [];
		this.exploreMapType = null;
	}

	LayerController.prototype = {
		observeProject: function(prj) {
			prj.eventDispatcher().
			 bind(
				mobmap.MMProject.LAYERLIST_CHANGE,
				this.onProjectLayerlistChange.bind(this)
			 ).
			 bind(
				mobmap.MMProject.LAYERLIST_ORDER_SWAP,
				this.onProjectLayerlistSwap.bind(this)
			 ).
			 bind(
				mobmap.MMProject.LAYERLIST_SWAP_FAIL,
				this.onProjectLayerlistSwapFail.bind(this)
			);
			
			this.checkLayerList(prj);
		},
		
		onProjectLayerlistSwap: function(e, senderProject) {
			var ov = this.getTopLayerOverlay();
			var paneElement = ov.getPanes()[ov.targetPane];
			
			var ll = senderProject.layerList;
			var len = ll.getCount();
			
			var removedElements = []
			var i;
			for (i = 0;i < len;++i) {
				var lyr = ll.getLayerAt(i);
				var mapOverlay = this.findMapOverlayFor(lyr);
				if (mapOverlay && mapOverlay.canvas) {
					if (mapOverlay.canvas.parentNode === paneElement) {
						mapOverlay.canvas.parentNode.removeChild(mapOverlay.canvas);
						removedElements.push(mapOverlay.canvas);
					}
				}
			}

			for (i in removedElements) {
				paneElement.appendChild(removedElements[i]);
			}
		},
		
		onProjectLayerlistSwapFail: function(e, senderProject, layerIndex, moveDirection) {
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
			
			this.addExploreLayerIfNeeded(prj);
		},
		
		addExploreLayerIfNeeded: function(prj) {
//return; // * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
			var ll = prj.layerList;
			var len = ll.getCount();
			
			var already_exists = (ll.countExploreLayers() > 0);
			if (already_exists) {
				return;
			}
			
			if (ll.countMovingObjectLayers() > 0) {
				prj.addExploreLayer();
			}
		},

		moveToOverlayCenter: function(overlay) {
			var ownerLayer = overlay.ownerObject;
			if (ownerLayer.capabilities & mobmap.LayerCapability.MarkerRenderable) {
				this.moveToMarkersOverlayCenter(overlay);
			}
		},
		
		moveToMarkersOverlayCenter: function(markersOverlay) {
			var pickPool = this.ensureOverlayPickPool(markersOverlay);
			pickPool.clear();
			
			markersOverlay.ownerObject.movingData.pickAt(pickPool, 0);
			var len = pickPool.pickedCount;
			if (len < 1) { return; }
			
			var xSum = 0, ySum = 0;
			
			var arr = pickPool.getArray();
			for (var i = 0;i < len;++i) {
				var rec = arr[i];
				xSum += rec.x;
				ySum += rec.y;
			}
			
			xSum /= len;
			ySum /= len;
			this.ownerApp.moveMapTo(ySum, xSum);
		},

		// OVERLAY FACTORY ==============================

		createNewOverlayForLayer: function(lyr) {
			if (lyr.capabilities & mobmap.LayerCapability.MarkerRenderable) {
				return this.createMovingObjectsOverlay(lyr);
			} else if (lyr.capabilities & mobmap.LayerCapability.ExploreOtherLayer) {
				return this.createExploreOverlay(lyr);
			} else {
				return this.createMeshOverlay(lyr);
			}
		},
		
		createMovingObjectsOverlay: function(lyr) {
			var mapOverlay = new mobmap.GLMobLayer();
			if (lyr.capabilities & mobmap.LayerCapability.TyphoonMarkerRecommended) {
				mapOverlay.shaderType = mobmap.GLMobLayer.ShaderType.Typhoon;
			}
			
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
		
		createExploreOverlay: function(lyr) {
			var mapPane = this.ownerApp.getMapPane();
			var x = mobmap.ExploreMapType.installMapType( mapPane.getGoogleMaps() );
			x.ownerObject = lyr;
			this.exploreMapType = x;
			return x;
		},

		// ==============================================

		observeLayerIfNot: function(lyr) {
			if (lyr._lctrlObserved) {
				return false;
			}

			var LE = mobmap.LayerEvent;
			lyr._lctrlObserved = true;
			lyr.eventDispatcher().
			 bind(LE.LoadFinish, this.onLayerLoadFinish.bind(this)).
			 bind(LE.LoadError, this.onLayerLoadError.bind(this)).
			 bind(LE.RequestDelete, this.onLayerRequestDelete.bind(this)).
			 bind(LE.RequestGoDown, this.onLayerRequestGoDown.bind(this)).
			 bind(LE.RequestGoUp, this.onLayerRequestGoUp.bind(this)).
			 bind(LE.Destroy, this.onLayerDestroy.bind(this)).
			 bind(LE.ExploreTargetSet, this.onLayerExploreTargetSet.bind(this)).
			 bind(LE.ExploreViewTypeChange, this.onLayerExploreViewTypeChange.bind(this)).
			 bind(LE.ExploreViewOptionChange, this.onLayerExploreViewOptionChange.bind(this)).
			 bind(LE.ExploreTargetSelectionChange, this.onLayerExploreTargetSelectionChange.bind(this)).
			 bind(LE.VisibilityChange, this.onLayerVisibilityChange.bind(this)).
			 bind( mobmap.MMMeshLayer.RENDER_VALUE_RANGE_CHANGE, this.onLayerRenderValueMaxChange.bind(this) ).
			 bind( mobmap.MMMeshLayer.COLOR_RULE_CHANGE, this.onLayerColoringRuleChange.bind(this) ).
			 bind( mobmap.MMMeshLayer.CELL_APPEARANCE_CHANGE, this.onLayerCellAppearanceChange.bind(this) );

			// Observe layer internal events

			if (lyr._markerOptions) {
				lyr._markerOptions.eventDispatcher().bind(
					mobmap.LayerMarkerOptions.CHANGE_EVENT,
					this.onLayerMarkerOptionsChange.bind(this, lyr) );
			}
			
			if (lyr.markerGenerator) {
				lyr.markerGenerator.eventDispatcher().bind(
					mobmap.MarkerGenerator.CHANGE_EVENT,
					this.onLayerMarkerGeneratorConfigurationChange.bind(this, lyr)
				);
			}
			
			this.observeSelectionChangeOfLayer(lyr);

			return true;
		},
		
		redrawMap: function() {
			if (this.ownerApp) { this.ownerApp.redrawMap();}
		},
		
		onLayerLoadError: function(e, sourceLayer) {
			if (this.ownerApp) {
				this.ownerApp.removeBadLayer(sourceLayer);
			}
		},
		
		onLayerMarkerOptionsChange: function(sourceLayer, e) {
			this.redrawMap();
		},
		
		onLayerMarkerGeneratorConfigurationChange: function(sourceLayer, e) {
			this.redrawMap();
		},
		
		onLayerRenderValueMaxChange: function() {
			this.redrawMap();
		},
		
		onLayerColoringRuleChange: function() {
			this.redrawMap();
		},
		
		onLayerCellAppearanceChange: function() {
			this.redrawMap();
		},
		
		onLayerVisibilityChange: function(e, sourceLayer) {
			var ov = this.findMapOverlayFor(sourceLayer);
			if (ov) {
				ov.setVisibility(sourceLayer.visible);
				this.redrawMap();
			}
		},
		
		onLayerLoadFinish: function(e, sourceLayer) {
			var ov = this.findMapOverlayFor(sourceLayer);
			if (ov && sourceLayer.bindOverlay) {
				sourceLayer.bindOverlay(ov);
			}

			this.redrawMap();
			
			// This is the first layer.
			if (ov && this.mapOverlayList.length === 1) {
				this.moveToOverlayCenter(ov);
			}
		},
		
		onLayerRequestDelete: function(e, sourceLayer) {
			if (this.ownerApp) {
				this.ownerApp.confirmLayerDelete(sourceLayer);
			}
		},
		
		onLayerDestroy: function(e, sourceLayer) {
			if (this.ownerApp) {
				this.destroyOverlayForLayer(sourceLayer);
			}
		},
		
		onLayerRequestGoDown: function(e, sourceLayer) {
			if (this.ownerApp) {
				this.ownerApp.getCurrentProject().moveDownLayer(sourceLayer);
			}
		},

		onLayerRequestGoUp: function(e, sourceLayer) {
			if (this.ownerApp) {
				this.ownerApp.getCurrentProject().moveUpLayer(sourceLayer);
			}
		},
		
		onLayerExploreTargetSet: function(e, sourceLayer, newIndex) {
			var prj = this.ownerApp.getCurrentProject();
			if (!prj) { return; }
			
			var mt = this.findMapOverlayFor(sourceLayer);
			var t_id = sourceLayer.targetLayerId;
			var target_layer = prj.getLayerById(t_id);

			if (mt) {
				mt.setDataSource(target_layer);
				this.notifySelectionChangeToExploreLayer(target_layer);
			}
		},
		
		onLayerExploreViewTypeChange: function(e, sourceLayer, newValue) {
			var ov = this.findMapOverlayFor(sourceLayer);
			if (ov) {
				ov.setViewType(newValue);
			}
		},
		
		onLayerExploreViewOptionChange: function(e, sourceLayer) {
			var ov = this.findMapOverlayFor(sourceLayer);
			if (ov) {
				ov.restartTrajectoryDrawing();
			}
		},
		
		onLayerExploreTargetSelectionChange: function(e, sourceLayer) {
			var ov = this.findMapOverlayFor(sourceLayer);
			if (ov) {
				ov.referSelectedIDList( sourceLayer.getTargetSelectedIDList() );
			}
		},
		
		destroyOverlayForLayer: function(layer) {
			var overlay = this.findMapOverlayFor(layer);
			if (overlay) {
				overlay.willRemove();
				overlay.setMap(null);
				overlay.ownerObject = null;

				this.removeOverlayFromList(overlay);
			}
		},
		
		removeOverlayFromList: function(overlay) {
			var ls = this.mapOverlayList;
			var i = ls.indexOf(overlay);
			if (i < 0) { return false; }
			
			ls.splice(i, 1);
			return true;
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
			
			if (this.exploreMapType && this.exploreMapType.ownerObject === layerModel) {
				return this.exploreMapType;
			}
			
			return null;
		},
		
		observeMapPane: function(mapPane) {
			mapPane.eventDispatcher().bind(mobmap.MapPane.NEED_OVERLAYS_RENDER_EVENT, this.onMapPaneNeedsOverlaysRender.bind(this));
		},
		
		onMapPaneNeedsOverlaysRender: function(e, senderMapPane, targetTimeSec, timeDirection) {
			var ls = this.mapOverlayList;
			var len = ls.length;
			
			for (var i = 0;i < len;++i) {
				var overlay = ls[i];
				var layer   = ls[i].ownerObject;
				
				if (layer.shouldRenderAsPoints) {
					overlay.setTimeDirection(timeDirection);
					overlay.setShowTyphoonCloud(layer.typhoonMarkerOptions.showCloud);
					this.fillMarkerPool(overlay, layer, targetTimeSec);
				} else if (overlay.setPickTime) {
					overlay.resetRenderedRegion();
					overlay.setPickTime(targetTimeSec);
					overlay.setRenderValueMax(layer.renderValueRange.max);
					overlay.setColorList(layer.colorRule.cachedColorList);
					overlay.setValueLabelEnabled(layer.otherRenderingOptions.labeled);
					overlay.setCellSpacing(layer.otherRenderingOptions.spacing);
					overlay.render();
				}
			}
		},
		
		ensureOverlayPickPool: function(overlay) {
			if (!overlay._stockPickPool) {
				var movingData = overlay.ownerObject.movingData;
				overlay._stockPickPool = movingData.createPickPool();
			}
			
			return overlay._stockPickPool;
		},
		
		fillMarkerPool: function(overlay, sourceLayer, targetTimeSec) {
			if (!sourceLayer.dataReady) {return;}
			var selOnly = sourceLayer._markerOptions.showSelectedOnly;

			// Vary marker by attribute(if set) --------------------------------------
			var boundAttrName = null;
			var chipW = overlay.markerTextureConf.chipWidth;
			var chipH = overlay.markerTextureConf.chipHeight;
			if (sourceLayer._markerOptions && sourceLayer._markerOptions.varyingType === mobmap.LayerMarkerOptions.MV_ATTR) {
				boundAttrName = sourceLayer._markerOptions.boundAttributeName;
			}
			// -----------------------------------------------------------------------

			// Selection --
			var selection_pl = sourceLayer.localSelectionPool;
			var anySelected = selection_pl.isAnySelected();
			// ------------

			var movingData = sourceLayer.movingData;
			var mk_pool = overlay.getTopMarkerPool();
			mk_pool.clear();
			
			this.prepareOverlayMarkerImage(overlay, sourceLayer); // dirty only
			
			// Get prepared pick pool (create if not ready)
			var pickPool = this.ensureOverlayPickPool(overlay);

			pickPool.clear();
			movingData.pickAt(pickPool, targetTimeSec);
			var count = pickPool.pickedCount;
			
			// console.log(count + " points on layer");

			mk_pool.begin(count);
			var src_array = pickPool.getArray();
			var m_array = mk_pool.getArray();
			for (var i = 0;i < count;++i) {
				var sourceRecord = src_array[i];
				var marker_data = m_array[i];
				
				if (selOnly && anySelected) {
					if (!selection_pl.isIDSelected(sourceRecord._id)) {
						marker_data.chipY = -1;
						continue;
					}
				}
				
				marker_data.lat = sourceRecord.y;
				marker_data.lng = sourceRecord.x;
				marker_data.chipY = 0;
				
				if (boundAttrName !== null) {
					var boundAttrVal = sourceRecord[boundAttrName];
					var mkIndex = sourceLayer.mapAttributeToMarkerIndex(boundAttrVal);
					
					marker_data.chipX = mkIndex * chipW;
				} else {
					marker_data.chipX = 0;
				}
				
				if (anySelected) {
					var this_selected = selection_pl.isIDSelected(sourceRecord._id);
					if (!this_selected) {
						marker_data.chipY = chipH;
					}
				}
			}
			
			overlay.resetRenderedRegion();
			overlay.renderGL();
			
			if (this.ownerApp) {
				this.ownerApp.notifyMovingDataPicked(sourceLayer, src_array, count);
			}
		},
		
		prepareOverlayMarkerImage: function(overlay, sourceLayer) {
			if (!(sourceLayer.capabilities & mobmap.LayerCapability.TyphoonMarkerRecommended)) {
				// Normal marker
				this.applyGeneratedMarkerOfLayer(overlay, sourceLayer); // dirty only
			} else {
				// Typhoon marker
				mobmap.GLMobLayer.ensureSharedCloudImage( overlay.setMarkerImage.bind(overlay) );
			}
		},

		applyGeneratedMarkerOfLayer: function(targetLayer, layer) {
			var mg = layer.markerGenerator;
			if (!mg.dirty) {
				return;
			}
			
			var textureSourceImage = mg.updateTextureCanvas();
			targetLayer.setMarkerComposition(mg.options.compositionType);
			if (targetLayer.setMarkerImage(textureSourceImage)) { // Success?
				mg.dirty = false;
			}
		},
		
		getTopLayerOverlay: function() {
			var ls = this.mapOverlayList;
			var len = ls.length;
			if (len < 1) { return null; }

			return ls[len - 1];
		},
		
		// ++ Selection observer ++
		observeSelectionChangeOfLayer: function(targetLayer) {
			if (this.hasLayerSelectionPool(targetLayer)) {
				targetLayer.
				 localSelectionPool.
				  eventDispatcher().
				   bind( mobmap.SelectionPool.CHANGE_EVENT, this.onLocalSelectionChange.bind(this, targetLayer) );
			}
		},
		
		unobserveSelectionChangeEvent: function(targetLayer) {
			
		},
		
		onLocalSelectionChange: function(sourceLayer, e) {
			this.redrawMap();
			this.notifySelectionChangeToExploreLayer(sourceLayer);
		},
		
		hasLayerSelectionPool: function(targetLayer) {
			return !!((targetLayer.capabilities & mobmap.LayerCapability.SpatialSelectable) &&
			     targetLayer.localSelectionPool);
		},
		
		notifySelectionChangeToExploreLayer: function(sourceLayer) {
			var prj = this.ownerApp.getCurrentProject();
			var ll = prj.layerList;
			var len = ll.getCount();
			
			for (var i = 0;i < len;++i) {
				var targetLayer = ll.getLayerAt(i);
				if (targetLayer.capabilities & mobmap.LayerCapability.ExploreOtherLayer) {
					targetLayer.updateSelectedObjects(sourceLayer);
				}
			}
		}
	};

	aGlobal.mobmap.LayerController = LayerController;
})(window);