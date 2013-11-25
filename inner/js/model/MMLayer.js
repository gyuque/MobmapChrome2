if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	var LayerEvent = {
		LoadWillStart: 'mm-layer-model-event-load-will-start',
		LoadProgressChange: 'mm-layer-model-event-load-progress-change',
		LoadFinish: 'mm-layer-model-event-load-progress-finish'
	};

	function MovingObjectLayer() {
		this.sourceLoader = null;
		this.primaryView = null;
		this._lvObserved = false;
		this.jElement = $(document.createElement('span'));
		
		this.movingData = null;
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
			this.movingData = new mobmap.MovingData();

			this.eventDispatcher().trigger(LayerEvent.LoadWillStart, this);
			loader.startFullLoad(this);
		},

		getSourceFileName: function() {
			return this.sourceLoader.fileName;
		},
		
		// CSV Loader Listener functions <<<<<<<<<<<<<<<<<
		
		csvloaderReadLine: function(fields, lineno) {
			var all = this.sourceLoader.countLines();
			if (all === 0) { all = 1; }
			
			var rat = lineno / all;
			if ((lineno % 100) === 0 || rat > 0.999999) {
				this.eventDispatcher().trigger(LayerEvent.LoadProgressChange, rat);
			}
			
			// Generate and register record
			var record = mobmap.MovingData.createEmptyRecord();
			this.sourceLoader.applyAttributeMapToFieldList(fields, record);
			this.movingData.register(record);
		},
		
		csvloaderLineError: function(e) {
			console.log("Loader error at MMLayer#csvloaderLineError", e)
		},
		
		csvloaderLoadFinish: function() {
			this.eventDispatcher().trigger(LayerEvent.LoadFinish, this);
			this.movingData.close();
			//console.log(this.movingData)
		}
	};
	
	aGlobal.mobmap.LayerEvent = LayerEvent;
	aGlobal.mobmap.MovingObjectLayer = MovingObjectLayer;
})(window);