var theApp = null;
(function(aGlobal) {
	var gmap_ready = false;

	// Entry point for the app
	function main() {
		waitGoogleMaps();
	}

	function mmGmapInitialized() {
		gmap_ready = true;
	}
	
	function waitGoogleMaps() {
		if (gmap_ready) {
			startApp();
		} else {
			setTimeout(waitGoogleMaps, 50);
		}
	}
	
	function startApp() {
		$('#content-pane').empty();
		
		var appScreen = new mobmap.Mobmap3PanesScreen(
							'mobmap-panes-view',
							'body-pane',
							'tools-pane'
						);
						
		theApp = new mobmap.Mobmap2App(appScreen);
	}


	// Hook
	window.onload = main;

	aGlobal.mmGmapInitialized = mmGmapInitialized;
})(window);