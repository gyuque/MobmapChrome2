if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function PolygonGateTester(gatePolygon) {
		this.gatePolygon = gatePolygon;
	}
	
	PolygonGateTester.prototype = {
		testBetweenRecords: function(record1, record2) {
			console.log(record1.x, record1._time, '  ', record2.x, record2._time);
			
			if (this.gatePolygon.checkCrossOrContain(record1.x, record1.y, record2.x, record2.y)) {
				console.log("  + HIT");
				return true;
			}
			
			return false;
		}
	};
	
	aGlobal.mobmap.PolygonGateTester = PolygonGateTester;
})(window);
