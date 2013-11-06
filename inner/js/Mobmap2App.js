if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function Mobmap2App(appScreen) {
		this.mapPane = null;
		
		this.appScreen = appScreen;
		this.setupScreen();
	}
	
	Mobmap2App.prototype = {
		setupScreen: function() {
			this.setupMapPane();
		},
		
		setupMapPane: function() {
			var targetPaneElement = this.appScreen.getContentPaneElement();
			this.mapPane = new mobmap.MapPane(targetPaneElement);
		}
	};

	// +++ Export +++
	aGlobal.mobmap.Mobmap2App = Mobmap2App;
})(window);