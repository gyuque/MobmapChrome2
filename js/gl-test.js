(function(aGlobal) {
	'use strict';

	var testTextureImage = null;
	var gmap = null;
	var gllayer = null;
	var testMovingData = null;
	var mdPickPool = null;
	var dataMinSec = 99999999999;
	var mapContainerElement = null;
	
	
	function doGLMapTest() {
		testTextureImage = new Image();
		testTextureImage.onload = setupScreen;
		
		testTextureImage.src = TEST_IMAGE;
	}
	
	function setupScreen() {
		testMovingData = generateTestData();
		mdPickPool = testMovingData.createPickPool();

		var box = document.getElementById("map-box");
		mapContainerElement = box;
		
		setupGoogleMaps(box);
	}
	
	function observeRange() {
		$('#time-range').change(function(){
			showCurrentTime(this);
		});
	}
	
	function showCurrentTime(rangeElement) {
		var t = dataMinSec + (rangeElement.value - 0) * 30;
		fillMarkerData(gllayer, t);
		gllayer.renderGL();
	}
	
	function fillMarkerData(mobLayer, pickTime) {
		mdPickPool.clear();
		testMovingData.pickAt(mdPickPool, pickTime);
		var len = mdPickPool.pickedCount;
		
		var pl = mobLayer.markerPool;
		pl.begin(len);

		var srcArray = mdPickPool.getArray();
		var destArray = pl.getArray();
		
		var pickedRec, renderMk;
		for (var i = 0;i < len;++i) {
			pickedRec = srcArray[i];
			renderMk  = destArray[i];
			
			renderMk.lng = pickedRec.x;
			renderMk.lat = pickedRec.y;
		}
	}
	
	function generateTestData() {
		var src = TestRecordListTokyo;
		var src_len = src.length;
		var mdat = new mobmap.MovingData();

		for (var i = 0;i < src_len;++i) {
			var record = src[i];
			
			var md_record = new mobmap.MovingData.createEmptyRecord();
			md_record._id = record.id;
			md_record._time = mobmap.GeoCSVLoader.parseFieldTime(record.t);
			md_record.x = record.x;
			md_record.y = record.y;

			if (md_record._time < dataMinSec) {
				dataMinSec = md_record._time;
			}

			mdat.register(md_record);
		}

		mdat.close();
		return mdat;
	}
	
	function setupGoogleMaps(containerElement) {
		var mapOptions = {
			zoom: 11,
			center: new google.maps.LatLng(35.8, 139.6),
			mapTypeId: google.maps.MapTypeId.ROADMAP
		};

		gmap = new google.maps.Map(containerElement, mapOptions);
		
		// ----------------------------------------------
		
		gllayer = new mobmap.GLMobLayer();
		
		gllayer.canvasReadyCallback = function() {
			gllayer.setMarkerImage(testTextureImage);
			observeRange();
		};
		
		gllayer.setMap(gmap);
	}

	var TEST_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3QsdCQ44Doe1nQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAABE0lEQVR42u3VvU7CUBjG8QeBeCA1fJiQNriUrQwmeAluzr0FL8tbYOYOGCVMbHYpaWOCYiR6EmLqJCzV0K3I/7edz+R9cvIeCcApq/yxlh24L1fdVHfnt/arcmwBZO5orEYn0OfrQuksLBRC3VSz4K6vltvUW/qhxWRZ2hBqvxXv+bcyRrJtT9JY6SzMDgnhp/j+dVfnTk1Oz0iSFpNlVsYQzvImG51AnicNh/txES23qcuBo8GovxuXVd4LUBJN1W6HShJpvU6URNNCl8bzlZye0eppo82zVTxfHV0TzIz/IGN8WRvJRveFe8DVTVfmoi77vlX8+FLaHnDyvwAAAAAAAAAAAAAAAAAAAAAAAAAA/CvfN1xTQ2lpHZUAAAAASUVORK5CYII=";
	aGlobal.doGLMapTest = doGLMapTest;
})(window);