if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function PolygonGateTester(gatePolygon) {
		this.gatePolygon = gatePolygon;
		this.bounds = {
			xMin: -999,
			xMax:  999,
			yMin: -999,
			yMax:  999
		};
		
		this.calcPolygonBounds();
	}
	
	PolygonGateTester.prototype = {
		testBetweenRecords: function(record1, record2) {
			// console.log(record1.x, record1._time, '  ', record2.x, record2._time);
			
			var xMin = this.bounds.xMin;
			var xMax = this.bounds.xMax;
			var yMin = this.bounds.yMin;
			var yMax = this.bounds.yMax;
			if (record1.x < xMin && record2.x < xMin) { return false; }
			if (record1.x > xMax && record2.x > xMax) { return false; }
			if (record1.y < yMin && record2.y < yMin) { return false; }
			if (record1.y > yMax && record2.y > yMax) { return false; }

			if (this.gatePolygon.checkCrossOrContain(record1.x, record1.y, record2.x, record2.y)) {
				// console.log("  + HIT");
				return true;
			}
			
			return false;
		},

		testSingleRecord: function(record) {
			return this.gatePolygon.checkLatLngContained(record.y, record.x);
		},
		
		calcPolygonBounds: function() {
			// init
			var bd = this.bounds;
			bd.xMin =  999;
			bd.xMax = -999;
			bd.yMin =  999;
			bd.yMax = -999;

			var pg = this.gatePolygon;
			var outer = pg.getOuterBoundary();
			var n = outer.length;
			for (var i = 0;i < n;++i) {
				var pt = outer[i];
				bd.xMin = Math.min(bd.xMin, pt.x);
				bd.xMax = Math.max(bd.xMax, pt.x);
				
				bd.yMin = Math.min(bd.yMin, pt.y);
				bd.yMax = Math.max(bd.yMax, pt.y);
			}
			
			bd.xMin -= 0.001;
			bd.xMax += 0.001;
			
			bd.yMin -= 0.001;
			bd.yMax += 0.001;
			console.log("BOUNDS", bd);
		}
	};
	
	aGlobal.mobmap.PolygonGateTester = PolygonGateTester;
})(window);
