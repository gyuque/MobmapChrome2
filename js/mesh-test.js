(function(aGlobal) {
	'use strict';
	var gSourceFile = null;
	var gMeshLoader = null;
	
	window.onload = function() {
		$(document.body.parentNode).bind('drop', function(e) {
			cancelEvent(e);
			
			gSourceFile = e.originalEvent.dataTransfer.files[0];
			setTimeout(doTest, 100);
			return false;
		}).
		 bind("dradenter", cancelEvent).
		 bind("dragover", cancelEvent);
	};

	function cancelEvent(e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	
	function doTest() {
		console.log("Starting test", gSourceFile);
		
		gMeshLoader = new mobmap.MeshCSVLoader(gSourceFile);
		console.log("+ Generated loader");
		
		gMeshLoader.preload(PreloadListener);
	}
	
	var PreloadListener = {
		csvloaderAfterPreloadFinish: function(loader) {
			console.log("+ Preload finished, lc=",loader.countLines());
			gMeshLoader.readMetadata();
			MeshDataSink.data = new mobmap.MeshData();
			gMeshLoader.readRestContentAsync(MeshDataSink);
		},
		
		csvloaderPreloadError: function(e) {
			console.log(e);
		}
	};
	
	var MeshDataSink = {
		data: null,
		meshloaderNewRecordLoaded: function(tSeconds, latIndex, lngIndex, value) {
			this.data.register(tSeconds, latIndex, lngIndex, value);
			console.log("New Record:", latIndex, lngIndex, "=>", value, "at", tSeconds);
		},
		
		meshloaderLoadFinish: function() {
			this.data.close();
			console.log("+ Finish", this.data);
		}
	};
})(window);