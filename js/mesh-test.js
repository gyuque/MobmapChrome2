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
			
			checkTestdataRange(this.data);
			testPicker(this.data);
		}
	};
	
	function checkTestdataRange(mdat) {
		var r = mdat.indexRange;
		var x_count = r.maxX - r.minX + 1;
		var y_count = r.maxY - r.minY + 1;
		console.log("XCount=",x_count, "  YCount="+y_count);
		if (x_count !== 4) {
			console.log("  * BAD");
		}
	}
	
	function testPicker(mdat) {
		console.log("-------- testing picker --------");
		
		var r = mdat.indexRange;
		var x_count = r.maxX - r.minX + 1;
		var y_count = r.maxY - r.minY + 1;
		for (var j = 0;j < y_count;++j) {
			for (var i = 0;i < x_count;++i) {
				var cx = r.minX + i;
				var cy = r.minY + j;
				
				mdat.pick(cy, cx, 0);
			}
		}
	}
})(window);