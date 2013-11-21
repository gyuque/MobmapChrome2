if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	var LayerEvent = {
		LoadProgressChange: 'mm-layer-model-event-load-progress-change'
	};

	function MovingObjectLayer() {
		this.sourceLoader = null;
		this.primaryView = null;
		this.jElement = $(document.createElement('span'));
	}
	
	MovingObjectLayer.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		hasPrimaryView: function() {
			return !!this.primaryView;
		},
		
		loadFromLoader: function(loader) {
			this.sourceLoader = loader;
			loader.startFullLoad(this);
		},
		
		// CSV Loader Listener functions <<<<<<<<<<<<<<<<<
		
		csvloaderReadLine: function(fields, lineno) {
			var all = this.sourceLoader.countLines();
			if (all === 0) { all = 1; }
			
			var rat = lineno / all;
			if ((lineno % 100) === 0 || rat > 0.99999) {
				this.eventDispatcher().trigger(LayerEvent.LoadProgressChange, rat);
			}
		},
		
		csvloaderLineError: function(e) {
			console.log("Loader error at MMLayer#csvloaderLineError", e)
		},
		
		csvloaderLoadFinish: function() {
		}
	};
	
	aGlobal.mobmap.LayerEvent = LayerEvent;
	aGlobal.mobmap.MovingObjectLayer = MovingObjectLayer;
})(window);