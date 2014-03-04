if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MeshLoaderController(listener) {
		this.listener = listener;
		this.meshLoader = null;
		this.meshData = null;
		this.meshLayer = null;
		
		this.targetProject = null;
		this.lastError = 0;
	}

	MeshLoaderController.prototype = {
		setTargetProject: function(pj) {
			this.targetProject = pj;
		},
		
		setLayer: function(lyr) {
			this.meshLayer = lyr;
		},
		
		loadFile: function(targetFile) {
			this.meshLoader = new mobmap.MeshCSVLoader(targetFile);
			this.meshData = new mobmap.MeshData();

			if (this.meshLayer) {
				this.meshLayer.sourceLoader = this.meshLoader;
				this.meshLayer.setMeshData(this.meshData);
			}

			this.meshLoader.preload(this);
			return this.meshData;
		},
		
		// Preload callbacks
		csvloaderAfterPreloadFinish: function(loader) {
			console.log("+ Preload finished, lc=",loader.countLines());
			this.meshLoader.readMetadata();
			this.meshData.meshDefinition = this.meshLoader.meshDefinition;
			this.meshData.dynamic = this.meshLoader.isDynamic();
			
			if (this.meshLoader.isValidType()) {
				this.meshLoader.readRestContentAsync(this);
			} else {
				this.reportError(1);
			}
		},
		
		csvloaderPreloadError: function(e) {
			console.log(e);
			this.reportError(2);
		},

		reportError: function(e) {
			this.lastError = e;
			if (this.listener && this.listener.meshldrctrl_ErrorOccurred) {
				this.listener.meshldrctrl_ErrorOccurred(this, e, this.meshLayer);
			}
		},

		// Content loader callbacks
		
		meshloaderNewRecordLoaded: function(tSeconds, latIndex, lngIndex, value) {
			this.meshData.register(tSeconds, latIndex, lngIndex, value);
			//console.log("New Record:", latIndex, lngIndex, "=>", value, "at", tSeconds);
		},
		
		meshloaderLoadFinish: function() {
			if (this.listener && this.listener.meshldrctrl_AfterLoadFinish) {
				this.listener.meshldrctrl_AfterLoadFinish(this);
			}
			
			if (this.meshLayer) {
				this.meshLayer.afterLoadFinish();
			}
		}
	};

	aGlobal.mobmap.MeshLoaderController = MeshLoaderController;
})(window);