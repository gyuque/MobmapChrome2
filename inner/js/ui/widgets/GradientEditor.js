if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function GradientEditor() {
		this.previewHeight = 10;
		this.previewWidth = 100;
		this.previewCanvas = document.createElement('canvas');

		this.stops = [];
		this.generateTestStops();
	}
	
	GradientEditor.prototype = {
		generateTestStops: function() {
			this.clearStops();
			
			var s1 = new GradientEditor.GradientStop(0, 255,0,0, 0);
			var s2 = new GradientEditor.GradientStop(1, 255,0,0, 1);
		},
		
		clearStops: function() {
			this.stops.length = 0;
			
		},
		
		addStop: function(st) {
			this.stops.push(st);
		}
	};
	
	GradientEditor.GradientStop = function(pos, r, g, b, a) {
		this.position = pos;
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}
	
	aGlobal.mobmap.GradientEditor = GradientEditor;
})(window);