(function() {
	var dataMinSec = 99999999999;
	var testMovingData = null;
	var mdPickPool = null;
	
	window.onload = function() {
		testMovingData = loadTestData();
		setTimeout(doBench, 100);
	};

	function loadTestData() {
		var src = TestRecordListTokyo;
		var src_len = src.length;

		var TEST_NEW = false;
		//TEST_NEW = true;
		
		document.body.appendChild( document.createTextNode( !TEST_NEW ? "-OLD Impl" : "*NEW Impl" ));
		var mdat = TEST_NEW ? (new mobmap.MovingData2()) : (new mobmap.MovingData());
		console.log("data obj", mdat);
		
		for (var i = 0;i < src_len;++i) {
			var record = src[i];
			
			var md_record = mobmap.MovingData2.createEmptyRecord();
			md_record._id = record.id;
			md_record._time = mobmap.GeoCSVLoader.parseFieldTime(record.t);
			md_record.x = record.x;
			md_record.y = record.y;
			
			mdat.register(md_record);
			
			if ((i % 10000) === 9999) {
				console.log("Progress: " +Math.floor(i*100/(src_len-1))+ "%");
			}

			if (md_record._time < dataMinSec) { dataMinSec = md_record._time; }
		}
		
		console.log(dataMinSec, new Date( dataMinSec*1000 ))
		mdat.close();

		mdPickPool = mdat.createPickPool();
		console.log(mdat.countIds(), "IDs");
		return mdat;
	}
	
	function doBench() {
		var mdat = testMovingData;
		
		var tStart = new Date();
		for (var i = 0;i < 10;++i) {
			var pickTime = dataMinSec + 60 * i + 1800;
			//var pickTime = dataMinSec + 6;
			
			mdPickPool.clear();
			mdat.pickAt(mdPickPool, pickTime);
		}
		
		var et = (new Date()) - tStart;
		console.log(et+" ms");
	}
})();