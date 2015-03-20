(function (aGlobal) {
	'use strict';

	function SpatioTemporalAnnotationManager() {
		this.list = [];
	}
	
	SpatioTemporalAnnotationManager.prototype = {
		add: function(n) {
			if (this.checkExistence(n)) {
				return n;
			}
			
			this.list.push(n);
			
			return n;
		},
		
		clear: function() {
			this.list.length = 0;
		},
		
		getCount: function() {
			return this.list.length;
		},
		
		checkExistence: function(n) {
			var ls = this.list;
			for (var i in ls) {
				if (ls[i] === n) { return true; }
			}
			
			return false;
		},
		
		getAt: function(i) {
			return this.list[i] || null;
		},
		
		debug_addTestAnnotation: function() {
			this.clear();
			
			var testT = 1315440000;
			var lat = 35.6529;
			var lng = 139.6852;

			var pa = new SpatioTemporalAnnotationManager.PointAnnotation(lat, lng, testT);
			this.add(pa);

			var pa2 = new SpatioTemporalAnnotationManager.PointAnnotation(35.5, 139.9, testT + 3600*32);
			this.add(pa2);
		},
		
		debug_addTestAnnotation2: function() {
			var ls = [
				[33.9, 136.9, 1316574000],
				[34.7, 137.6, 1316581200],
				[34.9, 137.8, 1316584800],
				[35.9, 139.2, 1316595600],
				[37.1, 140.7, 1316606400]
			];
			
			for (var i in ls) {
				var item = ls[i];
				var pa = new SpatioTemporalAnnotationManager.PointAnnotation(item[0], item[1], item[2]);
				this.add(pa);
			}
		}
	};
	
	SpatioTemporalAnnotationManager.PointAnnotation = function(lat, lng, timeInSeconds) {
		this.t = timeInSeconds;
		this.lat = lat;
		this.lng = lng;
	};
	
	aGlobal.SpatioTemporalAnnotationManager = SpatioTemporalAnnotationManager;
})(window);
