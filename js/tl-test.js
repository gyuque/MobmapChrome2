(function(aGlobal) {
	'use strict';
	
	var gTL1 = null;
	
	function doWidgetTest() {
		gTL1 = new mobmap.TimelineBar();
		
		var container = document.getElementById('tl-container-1');
		container.appendChild(gTL1.element);

		var startTimeObj = new Date(2013, 5, 12,  0, 0);
		var endTimeObj = new Date(2013, 11, 30,  10, 0);
		
		var dateTimeModel = new mobmap.DateTime();
		var initialCurrentTime = new Date(2013, 7, 15,  12, 0);
		dateTimeModel.setCurrentTime( Math.floor( initialCurrentTime.getTime() / 1000.0 ) );
		
		gTL1.setDateDisplayElement( document.getElementById('date-disp') );
		gTL1.setTimeDisplayElement( document.getElementById('time-disp') );
		gTL1.bindDateTime(dateTimeModel);
		
		console.log("Test Range\n", startTimeObj, "\n", endTimeObj);
		
		var t1 = Math.floor( startTimeObj.getTime() / 1000.0 );
		var t2 = Math.floor( endTimeObj.getTime() / 1000.0 );
		console.log(t1, t2);
		gTL1.setTimeRange(t1, t2);
		if (gTL1.longSpanBar.fullViewport()) {
			console.log("redraw again");
			gTL1.redrawBar();
		}
		
		gTL1.setWidth(380);
	}
	
	aGlobal.doWidgetTest = doWidgetTest;
})(window);