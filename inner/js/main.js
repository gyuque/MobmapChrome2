(function(aGlobal) {
	// Entry point for the app
	function main() {
		var appScreen = new mobmap.Mobmap3PanesScreen(
							'mobmap-panes-view',
							'body-pane',
							'tools-pane'
						);
	}


	// Hook
	window.onload = main;
})(window);