(function() {
	var gRemoteDownloadHost = null;
	var gAutoLoadURL = null;
	var gAutoLoadForceRefresh = false;;
	
	window.addEventListener("message", onReceiveMessage, false);
	window.onload = function() {
		setupRemoteDownloadHost();
	};
	
	function setupRemoteDownloadHost() {
		gRemoteDownloadHost = new mobmap.RemoteDownloadOuterHost();

		var inner = document.getElementById('sandbox-frame');
		var innerWindow = inner.contentWindow;
		var outerWindow = window;

		gRemoteDownloadHost.bindMessageWindow(outerWindow, innerWindow); 
	}

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
		setAutoLoadURL: function(params) {
			gAutoLoadURL = params.url;
			gAutoLoadForceRefresh = !!(params.force_refresh);
		},
		
		notifyAppReady: function() {
			if (gAutoLoadURL) {
				sendInnerMessage('notifyAutoLoadEnabled', {url: gAutoLoadURL, force_refresh: gAutoLoadForceRefresh}); 
			}

			sendSavedRemoteDownloaderURL();
		},

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
		},
		
		openMovieRecorderWindow: function() {
			if (MovieRecorderWindowPool.hasAny()) {
				return;
			}
			
			chrome.app.window.create('movie-recorder.html', {
				 minWidth: 740,
				 minHeight: 490,
				 width: 872,

				}, function(wnd){
					MovieRecorderWindowPool.add(wnd);
					
					wnd.contentWindow.setNowRecording = setNowRecording;
					wnd.contentWindow.outerWindowGetWidth = windowGetWidth;
					wnd.contentWindow.outerWindowGetHeight = windowGetHeight;
					wnd.contentWindow.outerRequestMapRender = requestMapRender;
					wnd.onClosed.addListener(MovieRecorderWindowPool.closed.bind(MovieRecorderWindowPool, wnd));
				});

		},
		
		notifyRenderRequestComplete: function(params) {
			MovieRecorderWindowPool.notifyRenderRequestComplete(params.req_id, params.rendered_time);
		},
		
		saveRemoteDownloaderURL: function(params) {
			chrome.storage.local.set({'remoteDownloaderURL': params.url}, function() {
				console.log('saved',  params.url);
			});
		},
		
		resetApp: function() {
			chrome.runtime.reload();
		},
		
		openLayer3DView: function(params) {
			chrome.app.window.create('3dview.html', {
				 minWidth: 512,
				 minHeight: 384,
				 width: 512,

				}, function(wnd){
					wnd.contentWindow.sendRequest3DViewTargetData = sendRequest3DViewTargetData;
					wnd.contentWindow.sendRequestProjectionData = sendRequestProjectionData;
					wnd.contentWindow.mobmapInitData = {
						layerId: params.layerId,
						mapViewport: params.mapViewport
					};
				});
			console.log(params);
		},
		
		send3DViewTargetData: function(params) {
			sendParamsTo3DViewWindow('receive3DViewTargetData', params);
		},
		
		sendProjectionGridConfiguration: function(params) {
			sendParamsTo3DViewWindow('receiveProjectionGridConfiguration', params);
		},
		
		notifyCurrentTimeChanged: function(params) {
			sendParamsTo3DViewWindow('receiveCurrentTime', params.time);
		},
	};
	
	function sendParamsTo3DViewWindow(methodName, params) {
		var wls = chrome.app.window.getAll();
		for (var i in wls) {
			if (wls[i].contentWindow && wls[i].contentWindow[methodName]) {
				wls[i].contentWindow[methodName](params);
			}
		}
	}
	
	function sendSavedRemoteDownloaderURL() {
		chrome.storage.local.get('remoteDownloaderURL', function(o) {
			sendInnerMessage('restoreRemoteDownloaderURL', {url: o['remoteDownloaderURL']});
		});
	}
	
	function sendRequest3DViewTargetData(layerId) {
		sendInnerMessage('request3DViewTargetData', {layerId: layerId});
	}
	
	function sendRequestProjectionData(layerId, viewport) {
		sendInnerMessage('sendRequestProjectionData', {layerId: layerId, viewport: viewport});
	}
	
	function windowGetWidth() {return window.outerWidth;}
	function windowGetHeight() {return window.outerHeight;}
	function requestMapRender(requestId, dTime, frameIndex) {
		sendInnerMessage('requestRender', {time_delta: dTime, req_id: requestId, frameIndex: frameIndex});
	}
	
	function setNowRecording(enabled) {
		sendInnerMessage('setNowRecording', {enabled: enabled});
	}
	
	var MovieRecorderWindowPool = {
		pool: [],
		closed: function(wnd) {
			var i = this.pool.indexOf(wnd);
			if (i >= 0) {
				this.pool.splice(i, 1);
			}
		},
		
		hasAny: function() {
			return (this.pool.length > 0);
		},
		
		add: function(wnd) {
			if (this.pool.indexOf(wnd) < 0) {
				this.pool.push(wnd);
			}
		},
		
		notifyRenderRequestComplete: function(requestId, renderedTime) {
			for (var i in this.pool) {
				this.pool[i].contentWindow.notifyRenderRequestComplete(requestId, renderedTime);
			}
		}
	};
})();