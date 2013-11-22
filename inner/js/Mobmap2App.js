if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function Mobmap2App(appScreen) {
		this.mapPane = this.infoPane = this.layersView = this.currentProject = null;
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
		},

		getCurrentPeoject: function() {
			return this.currentProject;
		},

		// -----------------------------------------------------
		// Operations
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
		
		// -----------------------------------------------------
		// Screen builder
		setupScreen: function() {
			this.setupMapPane();
			this.setupInfoPane();
			
			this.infoPane.selectFirstTab();
		},
		
		setupMapPane: function() {
			var targetPaneElement = this.appScreen.getContentPaneElement();
			this.mapPane = new mobmap.MapPane(targetPaneElement);
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
			this.infoPane.setApp(this);
			this.layersView.setApp(this);
		}
	};

	// +++ Export +++
	aGlobal.mobmap.Mobmap2App = Mobmap2App;
})(window);