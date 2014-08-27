(function() {
	// Standard launching
	chrome.app.runtime.onLaunched.addListener(function (launchData) {
		openApp(function(win) {
		});
	});

	function openApp(callback) {
		var url = "outer.html";

		chrome.app.window.create(url, {
			 minWidth: 800,
			 minHeight: 480,

			// For debugging :)
			// I want to place development tools at the center.
			left:10,
			top:10
			}, callback);
	}
})();