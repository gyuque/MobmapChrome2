if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function Mobmap2App(appScreen) {
		this.toolPane = this.mapPane = this.infoPane = this.layersView = this.dataView = this.annView = this.currentProject = null;
		this.projectionGridForOuter = null;
		this.layerController = new mobmap.LayerController(this);
		this.selectionController = new mobmap.SelectionController(this);
		this.playController = new mobmap.PlayController(this);
		this.jEventDispatcherElement = $(document.body);
		this.localfilePicker = new mobmap.LocalFilePicker( this.afterLocalCSVPick.bind(this) );
		this.localMeshFilePicker = new mobmap.LocalFilePicker( this.afterLocalMeshCSVPick.bind(this) );
		this.localPolygonsKMLFilePicker = new mobmap.LocalFilePicker( this.afterLocalPolygonsKMLPick.bind(this) );
		this.csvPreview = new mobmap.CSVPreviewWindow(this);
		this.meshLoaderCtrl = new mobmap.MeshLoaderController(this);
		this.layerDeleteDialog = new mobmap.LayerDeleteDialog();
		this.loadErrorDialog = new mobmap.LoadErrorDialog();
		this.gateBusyDialog = new mobmap.GateBusyDialog();
		this.calcSimDialog = new mobmap.CalcSimDialog();
		this.annotationRemoveDialog = new mobmap.AnnotationRemoveDialog();
		this.valueFillDialog = new mobmap.FillValueDialog();
		this.exportSelectionDialog = new mobmap.ExportSelectionDialog();
		this.resetDialog = new mobmap.ResetDialog();
		this.exportDataDialog = null;

		this.remoteCSVDialog = new mobmap.RemoteSourceDialog(this);
		this.remoteCSVDialog.okCallback = this.onRemoteCSVDialogOK.bind(this);
		this.remoteRefreshConfirmDialog = null;
		this.digitalTyphoonDialog = new mobmap.DigitalTyphoonDialog();
		this.digitalTyphoonDialog.okCallback = this.onDigitalTyphoonDialogOK.bind(this);

		this.nowRecordingMode = false;
		this.recordingFrameIndex = 0;
		this.clockVisible = false;
		this.appScreen = appScreen;
		this.setupScreen();
		this.connectWithViews();
		this.observeTimelineBarUIEvents();
		this.observeInfoPaneEvents();

		this.getToolPane().sendChosenPlaySpeed( this.playController );
		this.newProject();
		
	}
	
	Mobmap2App.PROJECT_SET_EVENT = 'mm-app-project-set';
	Mobmap2App.CLOCK_VISIBILITY_CHANGE_EVENT = 'mm-clock-visibility-changed';
	Mobmap2App.SELECTION_BOOL_CHANGE_EVENT = 'mm-selection-bool-changed';
	Mobmap2App.sendOuterMessage = function(command, params) {
		var msg = JSON.stringify({
			command: command,
			params: params
		});
		
		window.parent.postMessage(msg, '*');
	};
	
	Mobmap2App.prototype = {
		eventDispatcher: function() {
			return this.jEventDispatcherElement;
		},
		
		newProject: function() {
			var prj = new mobmap.MMProject();
			this.setProject(prj);
		},

		setProject: function(prj) {
			this.currentProject = prj;
			this.meshLoaderCtrl.setTargetProject(prj);
			this.eventDispatcher().trigger(Mobmap2App.PROJECT_SET_EVENT, prj);
			this.observeProjectEvents(prj);
			this.mapPane.observeProjectEvents(prj);
			
			if (this.toolPane) {
				this.toolPane.getTimelineBar().
				 bindDateTime( prj.currentDateTime ).
				 bindTimeRangeSelection( prj.timeRangeSelection );
			}
		},
		
		openDataDownloadService: function() {
			Mobmap2App.sendOuterMessage('openDownloadServiceWindow', null);
		},
		
		openMovieWindow: function() {
			Mobmap2App.sendOuterMessage('openMovieRecorderWindow', null);
		},
		
		// Export UIs and APIs
		openExportDest: function() {
			Mobmap2App.sendOuterMessage('openExportDest', null);
		},

		sendExportFileContent: function(content) {
			Mobmap2App.sendOuterMessage('sendExportFileContent', {content: content});
		},

		onMessage_notifyExportDestSucceeded: function(params) {
			if (this.exportDataDialog) {
				this.exportDataDialog.notifyExportDestSucceeded();
			}
		},
		
		onMessage_notifyExportDestWriteEnd: function() {
			if (this.exportDataDialog) {
				this.exportDataDialog.notifyExportDestWriteEnd();
			}
		},

		onMessage_notifyExportDestFailed: function(params) {
			if (this.exportDataDialog) {
				this.exportDataDialog.notifyExportDestFailed();
			}
		},
		
		
		toggleShowClock: function() {
			this.clockVisible = !this.clockVisible;
			this.getMapPane().setClockVisibility(this.clockVisible);
			this.eventDispatcher().trigger(Mobmap2App.CLOCK_VISIBILITY_CHANGE_EVENT, this.clockVisible);
		},
		
		setSelectionBooleanOperation: function(t) {
			if (this.selectionController) {
				var changed = this.selectionController.setBoolOp(t);
				
				if (changed) {
					this.eventDispatcher().trigger(Mobmap2App.SELECTION_BOOL_CHANGE_EVENT, this.selectionController.boolOp);
				}
			}
		},


		getCurrentProject: function() {
			return this.currentProject;
		},
		
		getLayerController: function() {
			return this.layerController;
		},

		// (shortcut method)
		getCurrentProjectDateTime: function() {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }
			
			return prj.currentDateTime;
		},

		observeProjectEvents: function(prj) {
			prj.eventDispatcher().
			 bind(
				mobmap.MMProject.LAYERLIST_CHANGE,
				this.onProjectLayerlistChange.bind(this)
			 ).
			 bind(
				mobmap.LayerEvent.LoadFinish,
				this.onAnyLayerLoadFinish.bind(this)
			 );
			
			prj.currentDateTime.eventDispatcher().bind(
				mobmap.DateTime.CURRENT_TIME_CHANGE_EVENT,
				this.onCurrentDateTimeChange.bind(this)
			);
			
			// Time range selection changes
			prj.timeRangeSelection.eventDispatcher().
			 bind(
			  mobmap.TimeRangeSelection.FLOATING_CHANGE_EVENT,
			  this.onTimeRangeFloatingSelectionChange.bind(this)
			 ).
			 bind(
			  mobmap.TimeRangeSelection.CHANGE_EVENT,
			  this.onTimeRangeSelectionChange.bind(this)
			 );
			
			this.layerController.observeProject(prj);
		},

		onProjectLayerlistChange: function(e, senderProject) {
			if (senderProject === this.currentProject) {
				this.refreshAllLayersTimeRange();
			}
		},
		
		onAnyLayerLoadFinish: function(e, senderLayer) {
			this.refreshAllLayersTimeRange();
		},
		
		refreshAllLayersTimeRange: function() {
			var allRange = this.currentProject.getAllLayersTimeRange();
			if (allRange.end > allRange.start && allRange.end > 0) {
				// Valid range

				if (this.toolPane) {
					var tl = this.toolPane.getTimelineBar();
					tl.setTimeRange(allRange.start, allRange.end);
					tl.resetAndFullViewport();
					tl.adjustDateTimeIfOutsideRange();
				}
			}
		},

		onCurrentDateTimeChange: function(e, sender) {
			this.updateFloatingTimeSelectionIfNeeded();
			this.sendChangedTimeToOtherViewWindow();
		},

		// -----------------------------------------------------
		// Operations
		getMapPane: function() {
			return this.mapPane;
		},
		
		getToolPane: function() {
			return this.toolPane;
		},
		
		getDataView: function() {
			return this.dataView;
		},
		
		getTimelineBar: function() {
			return this.toolPane.getTimelineBar();
		},
		
		redrawMap: function() {
			this.getMapPane().redraw();
		},
		
		moveMapTo: function(lat, lng) {
			this.getMapPane().panTo(lat, lng);
		},
		
		openExportSelectionWindow: function(targetLayer) {
			this.exportSelectionDialog.showDialog(targetLayer);
		},
		
		loadLocalCSVMovingData: function() {
			this.localfilePicker.open();
		},
		
		loadRemoteCSVMovingData: function() {
			this.remoteCSVDialog.showDialogOnCenter("Remote resource", false, 384);
		},

		onRemoteCSVDialogOK: function() {
			var url = this.remoteCSVDialog.getURL();
			var f = this.remoteCSVDialog.getRefreshTokenEnabled();
			this.addRemoteSourceMovingObjectsLayer(url, f);
		},
		
		addRemoteSourceMovingObjectsLayer: function(url, enableForceRefresh) {
			var dl_client = new mobmap.RemoteDownloadInnerClient(url);
			dl_client.bindMessageWindow(window);
			dl_client.enableForceRefresh = !!enableForceRefresh;
			
			this.layersView.hideWelcomeBox();
			var newLayer = this.currentProject.addMovingObjectLayer(0, true);
			newLayer.loadFromLoader(dl_client);
		},
		
		refreshRemoteSourceLayer: function(layer) {
			if (!this.remoteRefreshConfirmDialog) {
				this.remoteRefreshConfirmDialog = new mobmap.RefreshConfirmDialog();
			}

			function onok(){
				if (layer.sourceLoader && layer.sourceLoader.url) {
					var url = removeForceRefreshParam(layer.sourceLoader.url);
					if (layer.sourceLoader.enableForceRefresh) {
						url = this.addForceRefreshToken(url);
					}

					Mobmap2App.sendOuterMessage('setAutoLoadURL', {
						url: url,
						force_refresh: !!(layer.sourceLoader.enableForceRefresh)
					});
				
					var form = document.createElement('form');
					var param1 = document.createElement('input');
					param1.name = 'autoload';
					param1.value = layer.sourceLoader.url;
					document.body.appendChild(form);
					form.submit();
				}
			}
			
			if (layer.sourceLoader) {
				this.remoteRefreshConfirmDialog.open(onok.bind(this), 
				  removeForceRefreshParam(layer.sourceLoader.url));
			}
		},
		
		addForceRefreshToken: function(originalURL) {
			return addParameterAfterURL(originalURL, kForceRefreshParamName + '=' + this.generateForceRefreshToken() );
		},
		
		generateForceRefreshToken: function() {
			return (new Date() | 0) ^ (Math.random() * 0x7fffffff);
		},

		loadLocalCSVMeshData: function() {
			this.localMeshFilePicker.open();
		},
		
		loadDigitalTyphoon: function() {
//Typhoon TEST---------------------------------------------------------------------------------------------
//setTimeout((function(){ this.requestDigitalTyphoonDownload('http://agora.ex.nii.ac.jp/digital-typhoon/summary/wnp/s/201115.html.ja')}).bind(this),100);
//return;
			this.digitalTyphoonDialog.showDialogOnCenter();
		},
		
		onDigitalTyphoonDialogOK: function() {
			this.requestDigitalTyphoonDownload( this.digitalTyphoonDialog.getURL() );
		},
		
		requestDigitalTyphoonDownload: function(url) {
			Mobmap2App.sendOuterMessage('startDigitalTyphoonDownload', {url: url});
		},
		
		onMessage_loadDigitalTyphoonJson: function(params) {
			this.readDigitalTyphoonJSON(params.data);
		},

		afterLocalCSVPick: function(pickedFile) {
			if (pickedFile) {
				this.csvPreview.open();
				this.csvPreview.generatePreview(pickedFile);
				
				this.localfilePicker.reset();
			}
		},
		
		afterLocalMeshCSVPick: function(pickedFile) {
			if (pickedFile) {
				this.layersView.hideWelcomeBox();
				var newLayer = this.currentProject.addMeshLayer();
				this.meshLoaderCtrl.setLayer(newLayer);
				this.meshLoaderCtrl.loadFile(pickedFile);
				
				this.localMeshFilePicker.reset();
			}
		},
		
		loadCSVWithLoader: function(csvLoader) {
			var attrMap = this.csvPreview.syncAttributeMap();
			
			this.csvPreview.close();
			this.layersView.hideWelcomeBox();
			var newLayer = this.currentProject.addMovingObjectLayer();
			
			csvLoader.setAttributeMap(attrMap);
			newLayer.loadFromLoader(csvLoader);
		},
		
		readDigitalTyphoonJSON: function(source) {
			var j = JSON.parse(source);

			this.layersView.hideWelcomeBox();
			var newLayer = this.currentProject.addMovingObjectLayer( mobmap.LayerCapability.TyphoonMarkerRecommended );
			
			var loader = new mobmap.DigitalTyphoonLoader(newLayer);
			loader.loadFromObject(j);
		},
		
		// KML polygons
		loadPolygonsFromKML: function() {
			this.localPolygonsKMLFilePicker.reset();
			this.localPolygonsKMLFilePicker.open();
		},
		
		afterLocalPolygonsKMLPick: function(pickedFile) {
			mobmap.KMLLoader.createFromFileObject(
				pickedFile,
				this.afterLocalPolygonsKMLRead.bind(this)
			);
		},

		afterLocalPolygonsKMLRead: function(kmlLoader) {
			if (!kmlLoader) {
				// bad file
				this.loadErrorDialog.showDialog();
				return;
			}
			
			var newLayer = this.currentProject.addPolygonLayer();
			newLayer.setSourceLoader(kmlLoader);
			newLayer.afterLoadFinish();
		},

		removeBadLayer: function(targetLayer) {
			this.getCurrentProject().removeLayerAndNotify(targetLayer);
			this.loadErrorDialog.showDialog();
		},
		
		meshldrctrl_AfterLoadFinish: function(controller) {
		},
		
		meshldrctrl_ErrorOccurred: function(controller, err, targetLayer) {
			this.removeBadLayer(targetLayer);
		},
		
		confirmLayerDelete: function(targetLayer) {
			this.layerDeleteDialog.openWithLayer(
				targetLayer,
				this.onLayerDeleteOK.bind(this, targetLayer) );
		},
		
		onLayerDeleteOK: function(targetLayer) {
			var pj = this.getCurrentProject();
			if (pj) {
				pj.removeLayerAndNotify(targetLayer);
			}
		},
		
		showGateBusyDialog: function() { this.gateBusyDialog.showDialog(); },
		closeGateBusyDialog: function() { this.gateBusyDialog.close(); },
		updateGateBusyDialog: function(progressRate) {
			this.gateBusyDialog.showProgress(progressRate);
		},
		
		showExporterDialog: function() {
			if (!this.exportDataDialog) {
				this.exportDataDialog = new mobmap.ExportDataDialog(this);
			}
			
			this.exportDataDialog.open();
			this.exportDataDialog.fillLayerList(this.getCurrentProject());
		},
		
		// Selection operations
		clearSelection: function() {
			this.selectionController.clear();
		},
		
		getSelectionController: function() {
			return this.selectionController;
		},
		
		notifyMovingDataPicked: function(sourceLayer, pickedArray, count) {
			if (this.infoPane.isDataTabSelected()) {
				this.dataView.notifyMovingDataPicked(sourceLayer, pickedArray, count);
			}
		},
		
		// -----------------------------------------------------
		// Screen builder
		setupScreen: function() {
			this.setupToolPane();
			this.setupMapPane();
			this.setupInfoPane();
			
			this.infoPane.selectFirstTab();
		},
		
		setupToolPane: function() {
			var targetPaneElement = this.appScreen.getToolsPaneElement();
			this.toolPane = new mobmap.ToolPane(targetPaneElement);
			this.toolPane.observeContainerEvents(this.appScreen);
			this.toolPane.connectToSelectionController(this.selectionController);
		},
		
		setupMapPane: function() {
			var targetPaneElement = this.appScreen.getContentPaneElement();
			this.mapPane = new mobmap.MapPane(targetPaneElement);
			this.mapPane.observeContainerEvents(this.appScreen);
			this.mapPane.connectToSelectionController(this.selectionController);
			
			this.layerController.observeMapPane(this.mapPane);
		},
		
		setupInfoPane: function() {
			var targetPaneElement = this.appScreen.getInfoPaneElement();
			this.infoPane = new mobmap.InfoPane(targetPaneElement);
			this.infoPane.observeScreenResize(this.appScreen);
			this.infoPane.afterScreenResize();
			
			// View inside each pane
			var layersBoxEl = this.infoPane.getBoxByName('layers');
			this.layersView = new mobmap.LayersView(layersBoxEl);
			
			var dataBoxEl = this.infoPane.getBoxByName('data_detail');
			this.dataView = new mobmap.DataDetailView(dataBoxEl);
			
			var annBoxEl = this.infoPane.getBoxByName('ann');
			this.annView = new mobmap.AnnotationListView(annBoxEl);
		},
		
		connectWithViews: function() {
			this.toolPane.setApp(this);
			this.infoPane.setApp(this);
			this.mapPane.setApp(this);
			this.layersView.setApp(this);
			this.dataView.setApp(this);
			this.annView.setApp(this);
		},
		
		observeInfoPaneEvents: function() {
			this.infoPane.eventDispatcher().
			 bind(mobmap.InfoPane.INFOPANE_EVENT_DATAPAGE_SELECTED, this.onInfoPaneDataPageSelect.bind(this));
		},
		
		onInfoPaneDataPageSelect: function() {
			setTimeout(this.redrawMap.bind(this), 20);
		},

		// Timeline bar UI events - - - - - - -
		
		observeTimelineBarUIEvents: function() {
			var tl = this.getToolPane().getTimelineBar();

			tl.eventDispatcher().
			 bind(mobmap.TimelineBar.BAR_MOUSEDOWN, this.onTimelineBarMouseDown.bind(this) ).
			 bind(mobmap.TimelineBar.BAR_MOUSEUP, this.onTimelineBarMouseUp.bind(this) );
		},
		
		onTimelineBarMouseDown: function() {
			var pj = this.getCurrentProject();
			if (pj && pj.timeRangeSelection.hasFloating) {
				pj.timeRangeSelection.setFloatingStart( pj.getCurrentTimeInSeconds() );
			}
		},

		onTimelineBarMouseUp: function() {
			var pj = this.getCurrentProject();
			if (pj && pj.timeRangeSelection.hasFloating) {
				pj.timeRangeSelection.setFloatingEnd( pj.getCurrentTimeInSeconds() );
				pj.timeRangeSelection.commitFloating();
			}
		},

		// Play buttons - - - - - - - - - - - -
		onPlayStateButtonPush_play: function() {
			this.playController.play();
			
			//   Reset animation params AFTER invoking play controller
			// to avoid disturbed by auto-rewind.
			this.layerController.resetAnimation();
		},

		onPlayStateButtonPush_stop: function() {
			this.playController.stop();
		},

		onPlayStateButtonPush_ff: function() {
			this.playController.playFast();
			this.layerController.resetAnimation();
		},
		
		isAutoPlaying: function() {
			return this.playController.isPlaying();
		},
		
		idRecordingMode: function() {
			return this.nowRecordingMode;
		},

		onPlaySpeedSliderChange: function() {
			var pane = this.getToolPane();
			pane.sendChosenPlaySpeed( this.playController );
			pane.showPlaySpeedAsSpecialTexts();
		},

		onPlaySpeedSliderClick: function() {
			this.getToolPane().showPlaySpeedAsSpecialTexts();
		},

		onMakeTimeRangeButtonClick: function() {
			var pj = this.getCurrentProject();
			if (!pj) { return; }
			
			// Clear if selection exists
			if (pj.timeRangeSelection.anySelected()) {
				pj.timeRangeSelection.clear();
				this.getToolPane().setRangeButtonSelected(false);
				return;
			}

			if (!pj.timeRangeSelection.hasFloating) {
				this.getToolPane().setRangeButtonSelected(true);
				pj.timeRangeSelection.newFloating();
			}
		},
		
		updateFloatingTimeSelectionIfNeeded: function() {
			var pj = this.getCurrentProject();
			if (pj && pj.timeRangeSelection.hasFloating) {
				pj.timeRangeSelection.setFloatingEnd( pj.getCurrentTimeInSeconds() );
			}
		},
		
		onTimeRangeFloatingSelectionChange: function() {
		},
		
		onTimeRangeSelectionChange: function() {
		},
		
		onMessage_requestRender: function(params) {
			var dtime = params.time_delta;
			var pj = this.getCurrentProject();
			if (!pj) { dtime = 0; }

			this.recordingFrameIndex = params.frameIndex;
			
			if (dtime === 0) {
				// just redraw
				this.redrawMap(); 
			} else {
				// Shift time (and redraw)
				pj.currentDateTime.shiftTime(dtime, true);
				pj.currentDateTime.fire();
			}

			this.sendRenderRequestCompleteMessage(params);
		},
		
		onMessage_notifyAutoLoadEnabled: function(params) {
			if (params.url) {
				this.addRemoteSourceMovingObjectsLayer(params.url, params.force_refresh);
			}
		},

		onMessage_setRemoveCSVFileURL: function(params) {
			if (params.url) {
				this.remoteCSVDialog.setURL(params.url);
			} else {
				console.log("URL must be specified.");
			}
		},
		
		onMessage_restoreRemoteDownloaderURL: function(params) {
			this.remoteCSVDialog.setRemoteDownloaderURL(params.url || null);
		},
		
		onMessage_setNowRecording: function(params) {
			var enabled = params.enabled;

			this.nowRecordingMode = enabled;
			console.log("Recording mode:", enabled);
		},
		
		onMessage_request3DViewTargetData: function(params) {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }
			
			var layer = prj.getLayerById(params.layerId);
			if (layer) {
				var sendData = this.generate3DViewTargetData(layer);
				sendData.availableDynamicGridLayerList = this.pickupDynamicGridLayers();
				
				Mobmap2App.sendOuterMessage('send3DViewTargetData', {
					content: sendData,
					layerId: params.layerId,
					time: prj.getCurrentTimeInSeconds()
				});
				
				console.log(sendData)
			}
		},
		
		onMessage_sendRequestProjectionData: function(params) {
			if (!this.projectionGridForOuter) {
				this.projectionGridForOuter = new mobmap.FastProjectionGrid(9);
			}
			
			var pj = null;
			var lyr = this.getCurrentProject().getLayerById(params.layerId);
			if (lyr) {
				var overlay = this.layerController.findMapOverlayFor(lyr);
				if (overlay) {
					pj = overlay.getProjection();
				}
			}
			
			if (pj) {
				var b = params.viewport;
				this.projectionGridForOuter.update(pj, b.southLat, b.westLng, b.northLat, b.eastLng);
				
				var gconf = this.projectionGridForOuter.exportConfiguration();
				console.log('sendRequestProjectionData',  gconf)
				Mobmap2App.sendOuterMessage('sendProjectionGridConfiguration', {
					gridConfiguration: gconf,
					originalViewport: params.viewport
				});
			}
		},
		
		onMessage_sendRequest3DViewSubcontentData: function(params) {
			var prj = this.getCurrentProject();
			if (prj) {
				var layerId = parseInt(params.layerId, 10);
				var layer = prj.getLayerById(layerId);

				if (layer.meshData) {
					var dat = layer.meshData.exportForSubcontent();

					Mobmap2App.sendOuterMessage('sendGridSubcontentData', {
						data: dat,
						meshDefinition: layer.meshData.meshDefinition,
						timeInterval: layer.meshData.cellTimeInterval,
						minTime: this.calcMinimumTimeOfExportedMesh(dat)
					});
				}
			}
		},
		
		calcMinimumTimeOfExportedMesh: function(ls) {
			var mt = Number.POSITIVE_INFINITY;
			for (var i in ls) {
				var rec = ls[i];
				if (rec.t < mt) {
					mt = rec.t;
				}
			}
			
			return mt;
		},

		onMessage_sendSingleSelection: function(params) {
			var prj = this.getCurrentProject();
			if (prj) {
				var layerId = parseInt(params.layerId, 10);
				var layer = prj.getLayerById(layerId);
				if (layer && layer.localSelectionPool) {
					layer.localSelectionPool.clear(true);
					layer.localSelectionPool.addId(params.objId);
				}
			}
		},
		
		onMessage_sendSelectionByList: function(params) {
			var prj = this.getCurrentProject();
			if (prj) {
				var layerId = parseInt(params.layerId, 10);
				var layer = prj.getLayerById(layerId);
				if (layer && layer.localSelectionPool) {
					layer.localSelectionPool.clear(true);
					for (var i in params.idList) {
						layer.localSelectionPool.addId(params.idList[i], true);
					}
					
					layer.localSelectionPool.fire();
				}
			}
		},
		
		onMessage_showLocationMarker: function(params) {
			this.getMapPane().showAimingMarker(params.lat, params.lng);
		},

		generate3DViewTargetData: function(movingObjectsLayer) {
			var selp = movingObjectsLayer.localSelectionPool;
			var mdat = movingObjectsLayer.movingData;
			if (!mdat || !selp) {
				return null;
			}
			
			var nSelected = selp.count();
			if (nSelected > 1000) {
				return null;
			}
			
			var retObj = {
				availableDynamicGridLayerList: null,
				coloringInfo: movingObjectsLayer.exportMarkerColoringInfo(),
				record_list_array: null,
				nSelected: nSelected
			};
			
			
			selp.eachSelected(function(objId) {
				var tl = mdat.getTimeListOfId(objId);
				if (tl) {
					if (!retObj.record_list_array) { retObj.record_list_array=[]; }
					
					retObj.record_list_array.push({
						id: objId,
						recordList: tl.recordList
					});
				}
			});
			
			//console.log("SEND:", retObj);
			return retObj;
		},
		
		
		
		saveRemoteDownloaderURL: function(url) {
			Mobmap2App.sendOuterMessage('saveRemoteDownloaderURL', {url: url});
		},

		sendRenderRequestCompleteMessage: function(request_params) {
			// Add current time to params
			var pj = this.getCurrentProject();
			var rendered_time = (!pj) ? 0 : pj.currentDateTime.getCurrentTimeAsInt();


			Mobmap2App.sendOuterMessage('notifyRenderRequestComplete', {
					req_id: request_params.req_id,
					rendered_time: rendered_time
				});
		},
		
		sendSelectionChangeNotification: function(sourceLayer) {
			Mobmap2App.sendOuterMessage('notifyLayerLocalSelectionChange', {
				layerId: sourceLayer.layerId
			});
		},
		
		sendMarkerOptionsChangeNotification: function(sourceLayer) {
			Mobmap2App.sendOuterMessage('notifyLayerMarkerOptionsChange', {
				coloringInfo: sourceLayer.exportMarkerColoringInfo(),
				layerId: sourceLayer.layerId
			});
		},
		
		sendMarkerGeneratorConfigurationChangeNotification: function(sourceLayer) {
			this.sendMarkerOptionsChangeNotification(sourceLayer);
		},
		
		// Annotation operations
		
		invokeAnnotationCommand: function(annotationId, commandName) {
			var ann = this.findAnnotationById(annotationId);
			if (!ann) { return; }
			
			switch(commandName) {
				case 'putgate':
				this.putAnnotatedGate(ann);
				break;
				case 'sel':
				this.selectAnnotatedIDs(ann);
				break;
				case 'pin':
				this.toggleAnnotatedLocationPin(ann);
				break;
				case 'remove':
				this.confirmAnnotationRemove(ann);
				break;
			}
		},
		
		findAnnotationById: function(aid) {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }

			return prj.annotationList.findById(aid);
		},
		
		addAnnotatedGate: function(lat1, lng1, lat2, lng2, dir, condition) {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }
			
			var a = new mobmap.MMGateAnnotation(lat1, lng1, lat2, lng2, dir, condition || null);
			this.annView.setNewAnnotationId(a.id);
			prj.annotationList.append(a);
		},
		
		addCurrentSelectionToAnnotations: function(targetLayerId) {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }
			
			var layer = prj.getLayerById(targetLayerId);
			if (layer && (layer.capabilities & mobmap.LayerCapability.SpatialSelectable) ) {
				var ann = new mobmap.MMObjectCollectionAnnotation(layer.localSelectionPool.generateIDList());
				this.annView.setNewAnnotationId(ann.id);
				prj.annotationList.append(ann);
			}
		},
		
		putAnnotatedGate: function(gateAnnotation) {
			var mp = this.getMapPane();
			mp.putGate(gateAnnotation.startPos, gateAnnotation.endPos);
			mp.gateUI.setDirection(gateAnnotation.direction);
			mp.gateUI.clearCondition();
			mp.gateUI.setCondition(gateAnnotation.condition);
			mp.moveToGate();
		},

		selectAnnotatedIDs: function(collectionAnnotation) {
			this.selectionController.selectByIdList(collectionAnnotation.idlist);
		},

		revealAnnotationView: function() {
			this.infoPane.selectTabByName('ann');
		},

		toggleAnnotatedLocationPin: function(locationAnnotation) {
			this.getMapPane().toggleAnnotatedLocationPin(locationAnnotation);
		},
		
		putNewLocationAnnotation: function() {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }
			
			var center = this.getMapPane().getGoogleMaps().getCenter();
			var ann = new mobmap.MMLocationAnnotation(center.lat(), center.lng());
			this.annView.setNewAnnotationId(ann.id);
			prj.annotationList.append(ann);
			
			return ann;
		},

		changeAnnotatedLocationCoordinate: function(annId, lat, lng) {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }

			var ann = prj.annotationList.findById(annId);
			if (ann) {
				ann.changeCoordinate(lat, lng);
			}
		},
		
		confirmAnnotationRemove: function(ann) {
			this.annotationRemoveDialog.openWithAnnotation(
				ann,
				this.onAnnotationRemoveOK.bind(this, ann.id)
			);
		},
		
		onAnnotationRemoveOK: function(targetAnnotationId) {
			this.removeAnnotation(targetAnnotationId);
		},
		
		removeAnnotation: function(targetAnnotationId) {
			var prj = this.getCurrentProject();
			if (prj) {
				prj.annotationList.removeById(targetAnnotationId);
			}
		},

		reset: function() {
			this.resetDialog.open(function() {
				Mobmap2App.sendOuterMessage('resetApp', {});
			});
		},
		
		openLayer3DView: function(targetLayer) {
			Mobmap2App.sendOuterMessage('openLayer3DView', {
				layerId: targetLayer.layerId,
				mapViewport: this.fetchMapViewportInfo()
			});
		},
		
		sendChangedTimeToOtherViewWindow: function() {
			var prj = this.getCurrentProject();
			if (!prj) { return; }

			var t = prj.getCurrentTimeInSeconds();
			Mobmap2App.sendOuterMessage('notifyCurrentTimeChanged', {
				time: t
			});
		},
		
		fetchMapViewportInfo: function() {
			var m = this.getMapPane();
			if (!m) { return null; }
			
			return m.getViewportInfo();
		},
		
		openCalcSimDialog: function(layerId, objId) {
			var prj = this.getCurrentProject();
			var layer = prj.getLayerById(layerId);
			
			if (layer) {
				this.calcSimDialog.open(this.onCalcSimDialogOKClick.bind(this), layer, objId);
			}
		},

		onCalcSimDialogOKClick: function() {
			var dlg = this.calcSimDialog;
			
			var lyr = dlg.targetLayer;
			var oid = dlg.originObjectId;
			var ntype = dlg.getChosenNumType();
			var simType = dlg.getChosenSimType();
			var th = dlg.getThresholdForChosenType();
			var aname = dlg.getOutputAttributeName();
			var intv = dlg.getTimeInterval();
			
			mobmap.CalcSimDialog.calcSimilarity(lyr, oid, ntype, simType, th, aname, intv);
		},
		
		pickupDynamicGridLayers: function() {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }
			
			var retList = [];
			prj.forEachLayer(function(layerIndex, lyr) {
				if (lyr.capabilities & mobmap.LayerCapability.MeshRenderable) {
					if (lyr.meshData && lyr.meshData.dynamic && lyr.meshData.cellTimeInterval) {
						retList.push({
							id: lyr.layerId,
							name: lyr.getShortDescription()
						});
					}
				}
			});
			
			if (retList.length < 1) {
				return null;
			} else {
				return retList;
			}
		}
	};

	// +++ Export +++
	aGlobal.mobmap.Mobmap2App = Mobmap2App;
})(window);