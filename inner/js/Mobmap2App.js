if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function Mobmap2App(appScreen) {
		this.toolPane = this.mapPane = this.infoPane = this.layersView = this.dataView = this.annView = this.currentProject = null;
		this.layerController = new mobmap.LayerController(this);
		this.selectionController = new mobmap.SelectionController(this);
		this.playController = new mobmap.PlayController(this);
		this.jEventDispatcherElement = $(document.body);
		this.localfilePicker = new mobmap.LocalFilePicker( this.afterLocalCSVPick.bind(this) );
		this.localMeshFilePicker = new mobmap.LocalFilePicker( this.afterLocalMeshCSVPick.bind(this) );
		this.csvPreview = new mobmap.CSVPreviewWindow(this);
		this.meshLoaderCtrl = new mobmap.MeshLoaderController(this);
		this.layerDeleteDialog = new mobmap.LayerDeleteDialog();
		this.loadErrorDialog = new mobmap.LoadErrorDialog();
		this.gateBusyDialog = new mobmap.GateBusyDialog();

		this.digitalTyphoonDialog = new mobmap.DigitalTyphoonDialog();
		this.digitalTyphoonDialog.okCallback = this.onDigitalTyphoonDialogOK.bind(this);
		
		this.appScreen = appScreen;
		this.setupScreen();
		this.connectWithViews();
		this.observeTimelineBarUIEvents();
		this.observeInfoPaneEvents();

		this.getToolPane().sendChosenPlaySpeed( this.playController );
		this.newProject();
	}
	
	Mobmap2App.PROJECT_SET_EVENT = 'mm-app-project-set';
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
		},

		// -----------------------------------------------------
		// Operations
		getMapPane: function() {
			return this.mapPane;
		},
		
		getToolPane: function() {
			return this.toolPane;
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
		
		loadLocalCSVMovingData: function() {
			this.localfilePicker.open();
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
		},

		onPlayStateButtonPush_stop: function() {
			this.playController.stop();
		},

		onPlayStateButtonPush_ff: function() {
			this.playController.playFast();
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
			}
		},
		
		findAnnotationById: function(aid) {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }

			return prj.annotationList.findById(aid);
		},
		
		addAnnotatedGate: function(lat1, lng1, lat2, lng2, dir) {
			var prj = this.getCurrentProject();
			if (!prj) { return null; }
			
			var a = new mobmap.MMGateAnnotation(lat1, lng1, lat2, lng2, dir);
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
			mp.moveToGate();
		},
		
		selectAnnotatedIDs: function(collectionAnnotation) {
			this.selectionController.selectByIdList(collectionAnnotation.idlist);
		},

		revealAnnotationView: function() {
			this.infoPane.selectTabByName('ann');
		},
		
		toggleAnnotatedLocationPin: function(locationAnnotation) {
			var mp = this.getMapPane();
			console.log(locationAnnotation.coordinate)
		}
	};

	// +++ Export +++
	aGlobal.mobmap.Mobmap2App = Mobmap2App;
})(window);