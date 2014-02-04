if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function Mobmap2App(appScreen) {
		this.toolPane = this.mapPane = this.infoPane = this.layersView = this.currentProject = null;
		this.layerController = new mobmap.LayerController(this);
		this.selectionController = new mobmap.SelectionController(this);
		this.playController = new mobmap.PlayController(this);
		this.jEventDispatcherElement = $(document.body);
		this.localfilePicker = new mobmap.LocalFilePicker( this.afterLocalCSVPick.bind(this) );
		this.csvPreview = new mobmap.CSVPreviewWindow(this);
		
		this.appScreen = appScreen;
		this.setupScreen();
		this.connectWithViews();

		this.newProject();
	}
	
	Mobmap2App.PROJECT_SET_EVENT = 'mm-app-project-set';
	
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
			this.eventDispatcher().trigger(Mobmap2App.PROJECT_SET_EVENT, prj);
			this.observeProjectEvents(prj);
			this.mapPane.observeProjectEvents(prj);
			
			if (this.toolPane) {
				this.toolPane.getTimelineBar().bindDateTime( prj.currentDateTime );
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
		
		loadLocalCSVMovingData: function() {
			this.localfilePicker.open();
		},
		
		afterLocalCSVPick: function(pickedFile) {
			if (pickedFile) {
				this.csvPreview.open();
				this.csvPreview.generatePreview(pickedFile);
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
		
		// Selection operations
		clearSelection: function() {
			this.selectionController.clear();
		},
		
		getSelectionController: function() {
			return this.selectionController;
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
			
			var layersBoxEl = this.infoPane.getBoxByName('layers');
			this.layersView = new mobmap.LayersView(layersBoxEl);
		},
		
		connectWithViews: function() {
			this.toolPane.setApp(this);
			this.infoPane.setApp(this);
			this.mapPane.setApp(this);
			this.layersView.setApp(this);
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
		}
	};

	// +++ Export +++
	aGlobal.mobmap.Mobmap2App = Mobmap2App;
})(window);