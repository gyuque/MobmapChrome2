if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function Mobmap2App(appScreen) {
		this.mapPane = this.infoPane = this.layersView = null;
		
		this.appScreen = appScreen;
		this.setupScreen();
	}
	
	Mobmap2App.prototype = {
		
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
		}
	};

	// +++ Export +++
	aGlobal.mobmap.Mobmap2App = Mobmap2App;
})(window);