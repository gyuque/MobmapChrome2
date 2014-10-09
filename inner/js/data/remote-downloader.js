if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	var gClientID = 0;

	function RemoteDownloadOuterHost() {
		this.boundWindow = null;
		this.recieverWindow = null;
		this.geoCSVLoaderMap = {};
	}
	
	RemoteDownloadOuterHost.COMMAND_DOWNLOAD = 'startRemoteDownload';
	
	RemoteDownloadOuterHost.prototype = {
		bindMessageWindow: function(targetWindow, recieverWindow) {
			this.boundWindow = targetWindow;
			this.recieverWindow = recieverWindow;
			targetWindow.addEventListener('message', this.onMessage.bind(this), false);
		},

		onMessage: function(e) {
			dispatchCommandMethod(this, e);
		},
		
		command_startRemoteDownload: function(params) {
			this.downloadRemoteFile(params.url, params.clientId);
		},
		
		downloadRemoteFile: function(url, clientId) {
			var xhr = new XMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'blob';
			
			var success_handler = this.onDownloadSuccess.bind(this);
			var nwerror_handler = this.sendDownloadError.bind(this, clientId);
			
			xhr.onload = function(e) {
				if (this.status === 200) {
					success_handler(xhr, clientId);
				} else if ((this.status - 0) >= 400) {
					nwerror_handler();
				}
			};
			
			xhr.onerror = (function(e) {
				console.log(e, xhr.status);
				this.sendDownloadError(clientId);
			}).bind(this);
			
			xhr.onprogress = (function(e) {
				 this.sendDownloadProgress(e.loaded, clientId);
			}).bind(this);
			
			//setTimeout(function(){
			xhr.send();
			//},99);
		},
		
		onDownloadSuccess: function(xhr, clientId) {
			var contentBlob = xhr.response;
			var lmap = this.geoCSVLoaderMap;
			var loader = new mobmap.GeoCSVLoader(contentBlob);
			lmap[clientId] = loader;
			
			loader.setIgnoreFirstLine(true);
			loader.preload(this);
		},
		
		csvloaderAfterPreloadFinish: function(loader) {
			if (loader.owner) {
				var clientId = this.findClientId(loader.owner);
				if (clientId !== null) {
					this.sendLineCount(loader.owner.countLines(), clientId);
					var sink = new FullLoadSink(this, clientId);
					loader.owner.startFullLoad(sink);
				}
			}
		},
		
		csvloaderPreloadError: function() {
			
		},
		
		findClientId: function(loader) {
			for (var i in this.geoCSVLoaderMap) {
				if (this.geoCSVLoaderMap[i] === loader) {
					return i - 0;
				}
			}
			
			return null;
		},

		sendLineCount: function(lc, clientId) {
			var m = {
				command: RemoteDownloadInnerClient.COMMAND_HAND_LINE_COUNT,
				count: lc,
				clientId: clientId
			};
			
			this.recieverWindow.postMessage(JSON.stringify(m), '*');
		},
		
		sendDownloadError: function(clientId) {
			var m = {
				command: RemoteDownloadInnerClient.COMMAND_NOTIFY_DOWNLOAD_ERROR,
				clientId: clientId
			};
			
			this.recieverWindow.postMessage(JSON.stringify(m), '*');
		},
		
		sendDownloadProgress: function(loadedBytes, clientId) {
			var m = {
				command: RemoteDownloadInnerClient.COMMAND_NOTIFY_DOWNLOAD_PROGRESS,
				loaded: loadedBytes,
				clientId: clientId
			};
			
			this.recieverWindow.postMessage(JSON.stringify(m), '*');
		}
	};
	
	function FullLoadSink(owner, clientId) {
		this.owner = owner;
		this.clientId = clientId;
		this.attrMap = null;
	}
	
	FullLoadSink.prototype = {
		csvloaderReadLine: function(fields, lineno) {
			this.sendFields(RemoteDownloadInnerClient.COMMAND_HAND_CSV_LINE, fields, lineno);
		},
		
		csvloaderReadIgnoredLine: function(fields, lineno) {
			this.sendFields(RemoteDownloadInnerClient.COMMAND_HAND_META_LINE, fields, lineno);
		},

		sendFields: function(cmd, fields, lineno) {
			if (!lineno && lineno !== 0) {
				lineno = null;
			}
			
			this.postMessage({
				command: cmd,
				fields: fields,
				clientId: this.clientId,
				lineno: lineno
			});
		},
		
		postMessage: function(msgObj) {
			this.owner.recieverWindow.postMessage(JSON.stringify(msgObj), '*');
		},
		
		csvloaderLoadFinish: function(loader) {
			this.sendFields(RemoteDownloadInnerClient.COMMAND_FINISH, null);
		},
		
		csvloaderLineError: function(e) {
			this.postMessage({
				command: RemoteDownloadInnerClient.COMMAND_NOTIFY_DATA_ERROR,
				error: e
			});
		}
	};


	// Client(Alternative CSVLoader) - - - - - - - - - - - - - - - -
	function RemoteDownloadInnerClient(url) {
		if (!url) {
			throw "URL is not valid";
		}
		
		this.lineCountCache = 0;
		this.url = url;
		this.enableForceRefresh = false;
		this.boundWindow = null;
		this.clientId = gClientID++;
		this.loaderListener = null;
		this.attrMap = null;
		this.fileName = this.makeDisplayFileName(url);
	}

	RemoteDownloadInnerClient.COMMAND_HAND_META_LINE        = 'rdlHandMetaLine';
	RemoteDownloadInnerClient.COMMAND_HAND_CSV_LINE         = 'rdlHandCSVLine';
	RemoteDownloadInnerClient.COMMAND_HAND_LINE_COUNT       = 'rdlHandLineCount';
	RemoteDownloadInnerClient.COMMAND_NOTIFY_DOWNLOAD_ERROR = 'rdlNotifyDownloadError';
	RemoteDownloadInnerClient.COMMAND_NOTIFY_DOWNLOAD_PROGRESS = 'rdlNotifyDownloadProgress';
	RemoteDownloadInnerClient.COMMAND_NOTIFY_DATA_ERROR     = 'rdlNotifyDataError';
	RemoteDownloadInnerClient.COMMAND_FINISH = 'rdlFinish';

	RemoteDownloadInnerClient.prototype = {
		// Loader interface methods  - - - - - - -
		startFullLoad: function(loaderListener) {
			this.loaderListener = loaderListener;
			this.requestDownloadURL(this.url);
		},
		
		countLines: function() {
			return this.lineCountCache;
		},
		// - - - - - - - - - - - - - - - - - - - -

		bindMessageWindow: function(targetWindow) {
			this.boundWindow = targetWindow;
			targetWindow.addEventListener('message', this.onMessage.bind(this), false);
		},

		onMessage: function(e) {
			dispatchCommandMethod(this, e, this.clientId);
		},
		
		makeDisplayFileName: function(url) {
			return '☁ Remote';
		},
		
		requestDownloadURL: function(url) {
			var m = {
				command: RemoteDownloadOuterHost.COMMAND_DOWNLOAD,
				url: url,
				clientId: this.clientId
			};
			
			this.boundWindow.parent.postMessage(JSON.stringify(m), '*');
		},
		
		command_rdlHandLineCount: function(params) {
			this.lineCountCache = params.count;
		},
		
		command_rdlHandCSVLine: function(params) {
			if (this.loaderListener) {
				this.loaderListener.csvloaderReadLine(params.fields, params.lineno);
			}
		},
		
		command_rdlNotifyDownloadError: function() {
			if (this.loaderListener && this.loaderListener.csvloaderDownloadError) {
				this.loaderListener.csvloaderDownloadError();
			}
		},
		
		command_rdlNotifyDownloadProgress: function(params) {
			if (this.loaderListener && this.loaderListener.csvloaderDownloadProgress) {
				this.loaderListener.csvloaderDownloadProgress(params.loaded);
			}
		},

		command_rdlNotifyDataError: function(params) {
			if (this.loaderListener && this.loaderListener.csvloaderLineError) {
				this.loaderListener.csvloaderLineError(params.error);
			}
		},

		command_rdlHandMetaLine: function(params) {
			this.createAttributeMapping(params.fields);
			
			// Validate
			if (!this.attrMap.getAttributeMetadata('id')) {
				if (this.loaderListener && this.loaderListener.csvloaderLineError) {
					this.loaderListener.csvloaderLineError({message: "Meta line is invalid."});
				}
			}
		},

		command_rdlFinish: function(params) {
			if (this.loaderListener) {
				this.loaderListener.csvloaderLoadFinish();
			}
		},
		
		createAttributeMapping: function(metaColumnFields) {
			this.attrMap = new mobmap.AttributeMapping();
			for (var i in metaColumnFields) {
				var colIndex = i | 0;
				var rawName = metaColumnFields[i];
				var a_meta = null;
				
				if (this.isRequiredAttribute(rawName)) {
					a_meta = this.attrMap.addAttribute(rawName);
					a_meta.csvColumnIndex = colIndex;
					// console.log(colIndex, rawName);
				} else {
					var parsed = typedcolumnParseFieldName(rawName);

					a_meta = this.attrMap.addAttribute(parsed.name);
					a_meta.csvColumnIndex = colIndex;
					a_meta.dataType = parsed.type;
					// console.log(colIndex, a_meta);
				}
			}

			this.attrMap.generateColIndexMap();
			return this.attrMap;
		},

		isRequiredAttribute: function(rawName) {
			return kRequiredAttributes.indexOf(rawName) >= 0;
		}
	};

	function parseMessage(e) {
		if (!e) { return null; }
		if (!e.data) { return null; }
		if (e.data.indexOf('{') < 0) { return null; }
		
		return JSON.parse(e.data);
	}
	
	function dispatchCommandMethod(that, e, clientId) {
		var j = parseMessage(e);
		if (j && j.command) {
			var methodName = 'command_' + j.command;
			
			if (clientId || clientId === 0) {
				// Filter by client id
				if (j.clientId !== clientId) {
					return;
				}
			}
			
			if (that[methodName]) {
				that[methodName](j);
			}
		}
	}

	aGlobal.mobmap.RemoteDownloadInnerClient = RemoteDownloadInnerClient;
	aGlobal.mobmap.RemoteDownloadOuterHost = RemoteDownloadOuterHost;
})(window);