if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var connMapNextId = 1;

	function LayerController(ownerApp) {
		this.ownerApp = ownerApp;
		this.mapOverlayList = [];
		this.exploreMapType = null;
		
		this.connectionTempMapSet = {
			refs: {},
			ids: {},
			olds: {}
		};
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
			 ).
			 bind(
				mobmap.LayerEvent.DataChange,
				this.onAnyLayerDataChange.bind(this)
			 );
			
			prj.timeRangeSelection.eventDispatcher().
			 bind(
			  mobmap.TimeRangeSelection.CHANGE_EVENT,
			  this.onTimeRangeSelectionChange.bind(this)
			 );
			
			this.checkLayerList(prj);
		},
		
		onTimeRangeSelectionChange: function(e) {
			var r = this.ownerApp.getCurrentProject().timeRangeSelection.getFirstSelection();
			var st = r ? r.start : null;
			var ed = r ? r.end   : null;
			
			this.forEachExploreLayer( (function(exploreLayer) {
				var ov = this.findMapOverlayFor(exploreLayer);
				ov.setTimeRange(st, ed);
			}).bind(this) );
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
			} else if (lyr.capabilities & mobmap.LayerCapability.PolygonRenderable) {
				return this.createPolygonOverlay(lyr);
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
		
		createPolygonOverlay: function(lyr) {
			var mapOverlay = new mobmap.PolygonOverlay();
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
			 bind(LE.RequestRemoteRefresh, this.onLayerRequestRemoteRefresh.bind(this)).
			 bind(LE.DataOptionChange, this.onLayerDataOptionChange.bind(this)).
			 bind(LE.Destroy, this.onLayerDestroy.bind(this)).
			 bind(LE.ExploreTargetSet, this.onLayerExploreTargetSet.bind(this)).
			 bind(LE.ExploreViewTypeChange, this.onLayerExploreViewTypeChange.bind(this)).
			 bind(LE.ExploreViewOptionChange, this.onLayerExploreViewOptionChange.bind(this)).
			 bind(LE.ExploreTargetSelectionChange, this.onLayerExploreTargetSelectionChange.bind(this)).
			 bind(LE.ExploreTargetDataChange, this.onLayerExploreTargetDataChange.bind(this)).
			 bind(LE.VisibilityChange, this.onLayerVisibilityChange.bind(this)).
			 bind( mobmap.MMMeshLayer.RENDER_VALUE_RANGE_CHANGE, this.onLayerRenderValueMaxChange.bind(this) ).
			 bind( mobmap.MMMeshLayer.STAT_TARGET_LAYER_CHANGE, this.onLayerStatTargetLayerChange.bind(this) ).
			 bind( mobmap.MMMeshLayer.STAT_TARGET_ATTRIBUTE_NAME_CHANGE, this.onLayerStatTargetAttributeNameChange.bind(this) ).
			 bind( mobmap.MMMeshLayer.STAT_CHART_VISIBILITY_CHANGE, this.onLayerStatChartVisibilityChange.bind(this) ).
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
			this.ownerApp.sendMarkerOptionsChangeNotification(sourceLayer);
		},
		
		onLayerMarkerGeneratorConfigurationChange: function(sourceLayer, e) {
			this.redrawMap();
			this.ownerApp.sendMarkerGeneratorConfigurationChangeNotification(sourceLayer);
		},
		
		onLayerRenderValueMaxChange: function() {
			this.redrawMap();
		},
		
		onLayerStatTargetLayerChange: function() {
			this.redrawMap();
		},
		
		onLayerColoringRuleChange: function() {
			this.redrawMap();
		},
		
		onLayerStatTargetAttributeNameChange: function() {
			this.redrawMap();
		},
		
		onLayerStatChartVisibilityChange: function() {
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
		
		onLayerDataOptionChange: function(e, sourceLayer, changeFlags) {
			if (this.ownerApp && (changeFlags & mobmap.DataOptionChangeFlag_TimeOffset)) {
				this.ownerApp.refreshAllLayersTimeRange();
			}

			this.redrawMap();
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
		
		onLayerRequestRemoteRefresh: function(e, sourceLayer) {
			if (this.ownerApp) {
				this.ownerApp.refreshRemoteSourceLayer(sourceLayer);
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
		
		onLayerExploreTargetDataChange: function(e, sourceLayer) {
			var ov = this.findMapOverlayFor(sourceLayer);
			if (ov) {
				ov.refreshIfDependsData();
			}
		},
		
		onAnyLayerDataChange: function(e, sourceLayer) {
			this.redrawMap();
			this.notifyDataChangeToExploreLayer(sourceLayer);
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
					this.configureDynStatBeforeRendering(layer, overlay);
					overlay.resetRenderedRegion();
					overlay.setPickTime(targetTimeSec);
					overlay.setRenderValueMax(layer.renderValueRange.max);
					overlay.setColorList(layer.colorRule.cachedColorList);
					overlay.setValueLabelEnabled(layer.otherRenderingOptions.labeled);
					overlay.setCellSpacing(layer.otherRenderingOptions.spacing);
					overlay.render();
					
//overlay.dumpColorLegend();
				}
			}
		},

		configureDynStatBeforeRendering: function(layerModel, overlay) {
			var prj = this.ownerApp.getCurrentProject();
			if (!prj) { return; }

			if (layerModel.capabilities & mobmap.LayerCapability.StatOtherLayer) {
				var targetLayer = prj.getLayerById(layerModel.statTargetLayerId);
				var targetMovingData = null;
				if (targetLayer) {
					targetMovingData = targetLayer.movingData || null;
				}
				
				var originMeshData = layerModel.meshData;
				if (originMeshData) {
					originMeshData.setDynStatTargetMovingData(targetMovingData);
					originMeshData.setDynStatTargetAttributeName(layerModel.statTargetAttributeName);
					originMeshData.setDynStatFunctionType(layerModel.statFunctionType);
					overlay.statChartEnabled = !!(layerModel.statChartEnabled);
					overlay.useDynStatValueForColoring = !!(layerModel.useDynStatValueForColoring);
				}
//				console.log(targetLayer)
			}
		},

		ensureOverlayPickPool: function(overlay) {
			if (!overlay._stockPickPool) {
				var movingData = overlay.ownerObject.movingData;
				overlay._stockPickPool = movingData.createPickPool();
			}
			
			return overlay._stockPickPool;
		},
		
		resetAnimation: function() {
			var i;
			var cmapOlds = this.connectionTempMapSet.olds;
			for (i in cmapOlds) {
				cmapOlds[i] = null;
			}
			
			console.log("Clear");
		},

		fillMarkerPool: function(overlay, sourceLayer, targetTimeSec) {
			if (!sourceLayer.dataReady) {return;}
			var rec_mode = this.ownerApp.idRecordingMode();
			var rec_findex = this.ownerApp.recordingFrameIndex;
			var selOnly = sourceLayer._markerOptions.showSelectedOnly;

			// Vary marker by attribute(if set) --------------------------------------
			var boundAttrName = null;
			if (sourceLayer._markerOptions && sourceLayer._markerOptions.varyingType === mobmap.LayerMarkerOptions.MV_ATTR) {
				boundAttrName = sourceLayer._markerOptions.boundAttributeName;
			}
			
			// label
			var labelAttrName = sourceLayer._markerOptions.labelAttributeName || null;
			overlay.setLabelEnabled(!!labelAttrName);
			overlay.setLabelDisplayLimit(sourceLayer._markerOptions.labelDisplayLimit);
			if (labelAttrName) {
				overlay.setLabelInverted(sourceLayer._markerOptions.bLabelInverted);
			}

			// Tail ------------------------------------------------------------------
			var dircolor_enabled = false;
			var tailOnly = false;
			var tailFade = false;
			var tailLength = 0;
			var tailInterval = 1;
			var tailSpeedLimit = 0;
			if (sourceLayer._markerOptions && sourceLayer._markerOptions.tailType !== mobmap.LayerMarkerOptions.TAIL_NONE) {
				tailLength = sourceLayer._markerOptions.tailSegments;
				tailInterval = sourceLayer._markerOptions.tailInterval;
				tailSpeedLimit = sourceLayer._markerOptions.tailSpeedLimit;
				
				tailOnly = (sourceLayer._markerOptions.tailType === mobmap.LayerMarkerOptions.TAIL_ONLY);
				dircolor_enabled = (sourceLayer._markerOptions.tailColoring === mobmap.LayerMarkerOptions.TC_DIRECTION);
				tailFade = sourceLayer._markerOptions.tailFade;
			}
			
			// Connection ------------------------------------------------------------
			++connMapNextId;
			var connAttr = null;
			if (sourceLayer._markerOptions) {
				connAttr = sourceLayer._markerOptions.connectionAttributeName;
			}

			var cmapIDs  = this.connectionTempMapSet.ids;
			var cmapRefs = this.connectionTempMapSet.refs;
			var cmapOlds = this.connectionTempMapSet.olds;
			var connAnimationEnabled = this.ownerApp.isAutoPlaying() || rec_mode;
			
			// -----------------------------------------------------------------------
		//console.log(">>>>>", tailLength);
			// Selection --
			var selection_pl = sourceLayer.localSelectionPool;
			var anySelected = selection_pl.isAnySelected();
			// ------------

			var movingData = sourceLayer.movingData;
			var mk_pool = overlay.getTopMarkerPool();
			mk_pool.clear();
			
			this.prepareOverlayMarkerImage(overlay, sourceLayer); // dirty only
			// Chip size may be changed. Pick here.
			var chipW = overlay.markerTextureConf.chipWidth;
			var chipH = overlay.markerTextureConf.chipHeight;
			
//var benchT1 = new Date();
			// Get prepared pick pool (create if not ready)
			var pickPool = this.ensureOverlayPickPool(overlay);

			pickPool.clear();
			movingData.pickAt(pickPool, targetTimeSec, 0, tailLength, tailInterval);
			var count = pickPool.pickedCount;
//var benchT2 = new Date();
//console.log("Pick time: " + (benchT2 - benchT1));
			
			// console.log(count + " points on layer");

			mk_pool.begin(count);
			var src_array = pickPool.getArray();
			var m_array = mk_pool.getArray();

			for (var i = 0;i < count;++i) {
				var sourceRecord = src_array[i];
				var marker_data = m_array[i];
				var recId = sourceRecord._id;
				
				// Register reference to this marker
				marker_data.connectedMarker = null;
				if (connAttr) {
					var connDestId = sourceRecord[connAttr];
					// Calc animation frame
					if (connAnimationEnabled) {
						if (cmapOlds[recId] !== connDestId) {
							marker_data.connectionAnimationT = 0;
							marker_data.connectionAnimationOriginTime =
							 rec_mode ? rec_findex
							          : ( (new Date()) - 0 );
						} else {
							marker_data.connectionAnimationT = 
							 rec_mode ? Math.min(1,  (rec_findex - marker_data.connectionAnimationOriginTime) * 0.125    )
							          : Math.min(1,  (new Date() - marker_data.connectionAnimationOriginTime) * 0.004  );
							if (marker_data.connectionAnimationT < 0) { marker_data.connectionAnimationT = 0; }
						}
					} else {
						marker_data.connectionAnimationT = 1;
					}

					//console.log(cmapOlds[recId], connDestId, connAnimationEnabled)
					cmapIDs[recId] = connMapNextId;
					cmapRefs[recId] = marker_data;
					cmapOlds[recId] = connDestId;
				}
				
				if (selOnly && anySelected) {
					if (!selection_pl.isIDSelected(recId)) {
						marker_data.chipY = -1;
						marker_data.tailLengthToRender = 0;
						continue;
					}
				}
				
				marker_data.lat = sourceRecord.y;
				marker_data.lng = sourceRecord.x;
				marker_data.chipY = 0;
				marker_data.tailLengthToRender = tailLength;

				marker_data.labelText = (!!labelAttrName) ? sourceRecord[labelAttrName] : null;
								
				var mkIndex = 0;
				if (boundAttrName !== null) {
					var boundAttrVal = sourceRecord[boundAttrName];
					mkIndex = sourceLayer.mapAttributeToMarkerIndex(boundAttrVal);
				}

				if (tailOnly) {
					// Hide all markers
					marker_data.chipY = -1;
				} else {
					marker_data.chipX = mkIndex * chipW;
					
					if (anySelected) {
						var this_selected = selection_pl.isIDSelected(recId);
						if (!this_selected) {
							marker_data.chipY = chipH;
						}
					}
				}
				
				if (tailLength > 0) {
					var markerBaseColor = sourceLayer.getMarkerColorByIndex(mkIndex);

					marker_data.baseColor = markerBaseColor;
					marker_data.tailAlpha = 1;
					
					var tailSource = sourceRecord._tailRecords;
					var tailArray = marker_data.ensureTailArray(tailLength);
					
					// Check speed
					/*
					if (tailSpeedLimit > 0) {
						if (this.calcSpeedBetweenTails(sourceRecord, tailSource[0], tailInterval) > tailSpeedLimit) {
							marker_data.tailLengthToRender = 0;
							continue;
						}
					}
*/
					for (var j = 0;j < tailLength;++j) {
						var t_mk  = tailArray[j];
						var t_src = tailSource[j];
						t_mk.lat = t_src.y;
						t_mk.lng = t_src.x;
						
						if (boundAttrName !== null) {
							var t_boundAttrVal = t_src[boundAttrName];
							var t_mkIndex = sourceLayer.mapAttributeToMarkerIndex(t_boundAttrVal);
							t_mk.baseColor = sourceLayer.getMarkerColorByIndex(t_mkIndex);
						} else {
							t_mk.baseColor = markerBaseColor;
						}

						if (tailFade) {
							t_mk.tailAlpha = 1.0 - (j + 1) / tailLength;
						} else {
							t_mk.tailAlpha = 1;
						}
					}
				}
			}
			
			// Connect references
			if (connAttr) {
				this.setConnectedMarkerReferences(src_array, m_array, connMapNextId, cmapRefs, cmapIDs, connAttr);
				overlay.setConnectionColors(sourceLayer._markerOptions.gstopConnectionStart, sourceLayer._markerOptions.gstopConnectionEnd);
				overlay.setConnectionArrowEnabled(sourceLayer._markerOptions.enableConnectionArrow);
				overlay.setConnectionLineWidth(sourceLayer._markerOptions.connectionLineWidth);
			}
			
			if (tailLength > 0) { overlay.setTailWidth( sourceLayer._markerOptions.tailWidth ); }
			overlay.setTailDrawEnabled(tailLength > 0);
			overlay.setTailDirectionColorEnabled(dircolor_enabled);
			overlay.resetRenderedRegion();
			overlay.renderGL();
			
			if (this.ownerApp) {
				this.ownerApp.notifyMovingDataPicked(sourceLayer, src_array, count);
			}
		},

		setConnectedMarkerReferences: function(sourceRecordList, markerDataList, refid, refMap, ridMap, connAttrName) {
			var len = sourceRecordList.length;
			
			for (var i = 0;i < len;++i) {
				var srcRec = sourceRecordList[i];
				var srcMarker = markerDataList[i];
				var destId = srcRec[connAttrName];

				var rid = ridMap[destId];
				var ref = refMap[destId];

				if (rid === refid && ref) {
					srcMarker.connectedMarker = ref;
				}
			}
		},

		calcSpeedBetweenTails: function(originRecord, firstTailRecord, tailInterval) {
			var meters = calcDistanceFromLatLng(
				originRecord.x, originRecord.y,
				firstTailRecord.x, firstTailRecord.y);
				
			return (meters / tailInterval);
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
			var crop = mg.options.enableCrop;

			targetLayer.setMarkerChipSize(mg.options.chipWidth, mg.options.chipHeight);
			if (targetLayer.setMarkerImage(textureSourceImage, crop)) { // Success?
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
			this.ownerApp.sendSelectionChangeNotification(sourceLayer);
			
			this.redrawMap();
			this.applySelectionViewIfNeeded(sourceLayer);
			this.notifySelectionChangeToExploreLayer(sourceLayer);
			this.notifySelectionChangeToDataView(sourceLayer);
		},


		applySelectionViewIfNeeded: function(sourceLayer) {
			// Update view if layer is a polygon layer
			if (sourceLayer.capabilities & mobmap.LayerCapability.PolygonSelectable) {
				this.applyPolygonSelectionView(sourceLayer);
			}
		},

		applyPolygonSelectionView: function(sourceLayer) {
			var ov = this.findMapOverlayFor(sourceLayer);
			var selp = sourceLayer.localSelectionPool;

			var idmap = null;
			if (selp.isAnySelected()) {
				idmap = selp.idmap;
			}

			ov.updateSelectionView(idmap);
		},


		hasLayerSelectionPool: function(targetLayer) {
			var caps = targetLayer.capabilities;
			return !!(
				 ((caps & mobmap.LayerCapability.SpatialSelectable) || (caps & mobmap.LayerCapability.PolygonSelectable)) &&
			     targetLayer.localSelectionPool);
		},
		
		notifySelectionChangeToExploreLayer: function(sourceLayer) {
			this.notifyAnyChangeToExploreLayer(sourceLayer, 'updateSelectedObjects');
		},

		notifyDataChangeToExploreLayer: function(sourceLayer) {
			this.notifyAnyChangeToExploreLayer(sourceLayer, 'updateDataChangedObjects');
		},
		
		notifyAnyChangeToExploreLayer: function(sourceLayer, methodName) {
			this.forEachExploreLayer(function(exploreLayer) {
				exploreLayer[methodName](sourceLayer);
			});
		},
		
		notifySelectionChangeToDataView: function(sourceLayer) {
			this.ownerApp.getDataView().updateStaticLayerDataView();
		},
		
		forEachExploreLayer: function(proc) {
			var prj = this.ownerApp.getCurrentProject();
			var ll = prj.layerList;
			var len = ll.getCount();
			
			for (var i = 0;i < len;++i) {
				var targetLayer = ll.getLayerAt(i);
				if (targetLayer.capabilities & mobmap.LayerCapability.ExploreOtherLayer) {
					proc(targetLayer);
				}
			}
		}
	};

	aGlobal.mobmap.LayerController = LayerController;
})(window);