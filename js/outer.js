(function() {
	window.onload = function() {
		window.addEventListener("message", onReceiveMessage, false);
	};

	function onReceiveMessage(e) {
		if (!e.data) {return;}
		if (e.data.indexOf('{') < 0) {return;}
		
		var dat = JSON.parse(e.data);

		if (dat.command) {
			var proc = CommandProcs[dat.command];
			if (proc) {
				proc(dat.params);
			}
		}
	}
	
	var CommandProcs = {
		openDownloadServiceWindow: function() {

			chrome.app.window.create('japan-data-downloader.html', {
				 minWidth: 816,
				 minHeight: 520,

				}, function(){
					
				});

		}
	};
})();