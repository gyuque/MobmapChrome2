if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MeshLoaderController() {
		this.meshLoader = null;
		this.meshData = null;
		
		this.targetProject = null;
	}

	MeshLoaderController.prototype = {
		setTargetProject: function(pj) {
			this.targetProject = pj;
		},
		
		loadFile: function(targetFile) {
			this.meshLoader = new mobmap.MeshCSVLoader(targetFile);
			this.meshData = new mobmap.MeshData();
			
			this.meshLoader.preload(this);
		},
		
		// Preload callbacks
		csvloaderAfterPreloadFinish: function(loader) {
			console.log("+ Preload finished, lc=",loader.countLines());
			this.meshLoader.readMetadata();
			
			if (this.meshLoader.isValidType()) {
				this.meshLoader.readRestContentAsync(this);
			}
		},
		
		csvloaderPreloadError: function(e) {
			console.log(e);
			
		},
		
		// Content loader callbacks
		
		meshloaderNewRecordLoaded: function(tSeconds, latIndex, lngIndex, value) {
			this.meshData.register(tSeconds, latIndex, lngIndex, value);
			console.log("New Record:", latIndex, lngIndex, "=>", value, "at", tSeconds);
		},
		
		meshloaderLoadFinish: function() {
			this.meshData.close();
			console.log("+ Finish", this.meshData);
		}
	};

	aGlobal.mobmap.MeshLoaderController = MeshLoaderController;
})(window);