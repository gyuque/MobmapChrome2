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
	
	function sendInnerMessage(command, params) {
		var msg = JSON.stringify({
			command: command,
			params: params
		});

		var inner = document.getElementById('sandbox-frame');
		inner.contentWindow.postMessage(msg, '*');
	}
	
	var CommandProcs = {
		openDownloadServiceWindow: function() {

			chrome.app.window.create('japan-data-downloader.html', {
				 minWidth: 816,
				 minHeight: 520,

				}, function(){
					
				});

		},
		
		startDigitalTyphoonDownload: function(params) {
			chrome.app.window.create('typhoon-download-console.html', {
				 minWidth: 320,
				 minHeight: 240,

				}, function(win){
					win.contentWindow.closeSelf = function() { win.close(); };
					win.contentWindow.sendInnerMessage = sendInnerMessage;
					win.contentWindow.targetURL = params.url;
				});
		}
	};
})();