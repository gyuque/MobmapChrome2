if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function MeshLoaderController() {
		this.meshLoader = null;
		this.meshData = null;
	}

	MeshLoaderController.prototype = {
		loadFile: function(targetFile) {
			this.meshLoader = new mobmap.MeshCSVLoader(targetFile);
			this.meshData = new mobmap.MeshData();
			
			this.meshLoader.preload(this);
		},
		
		// Preload callbacks
		csvloaderAfterPreloadFinish: function(loader) {
			console.log("+ Preload finished, lc=",loader.countLines());
			this.meshLoader.readMetadata();
			//MeshDataSink.data = new mobmap.MeshData();
			//gMeshLoader.readRestContentAsync(MeshDataSink);
		},
		
		csvloaderPreloadError: function(e) {
			console.log(e);
		}
	};

	aGlobal.mobmap.MeshLoaderController = MeshLoaderController;
})(window);