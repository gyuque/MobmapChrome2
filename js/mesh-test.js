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
		},
		
		csvloaderPreloadError: function(e) {
			console.log(e);
		}
	};
})(window);