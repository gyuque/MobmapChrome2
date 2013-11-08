if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function Mobmap2App(appScreen) {
		this.mapPane = this.infoPane = this.layersView = this.currentProject = null;
		this.jEventDispatcherElement = $(document.body);
		this.localfilePicker = new mobmap.LocalFilePicker( this.afterLocalCSVPick.bind(this) );
		this.csvPreview = new mobmap.CSVPreviewWindow();
		
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
			this.setProject();
		},
		
		setProject: function(prj) {
			this.currentProject = prj;
			this.eventDispatcher().trigger(Mobmap2App.PROJECT_SET_EVENT, prj);
		},
		
		// -----------------------------------------------------
		// Operations
		loadLocalCSVMovingData: function() {
			this.localfilePicker.open();
		},
		
		afterLocalCSVPick: function() {
			this.csvPreview.open();
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
		},
		
		getCurrentProject: function() {
			console.log('IMPLEMENT HERE');
		}
	};

	// +++ Export +++
	aGlobal.mobmap.Mobmap2App = Mobmap2App;
})(window);