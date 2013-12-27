if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	var LayerEvent = {
		LoadWillStart: 'mm-layer-model-event-load-will-start',
		LoadProgressChange: 'mm-layer-model-event-load-progress-change',
		LoadFinish: 'mm-layer-model-event-load-progress-finish'
	};

	function MovingObjectLayer() {
		this.ownerList = null;
		this.sourceLoader = null;
		this.primaryView = null;
		this._lvObserved = false;
		this.jElement = $(document.createElement('span'));
		this.dataTimeRange = {
			start: 0,
			end: 0
		};
		
		this.markerGenerator = new mobmap.MarkerGenerator();
		this.movingData = null;
		
		this.shouldRenderAsPoints = true;
	}
	
	MovingObjectLayer.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		setOwnerList: function(ls) {
			this.ownerList = ls;
		},
		
		setParentEventElement: function(parentEventElement) {
			var selfElem = this.jElement[0];
			var cur = selfElem.parentNode;
			if (cur === parentEventElement) { return; }
			if (cur) { cur.removeChild(selfElem); }
			
			parentEventElement.appendChild(selfElem);
		},
		
		hasPrimaryView: function() {
			return !!this.primaryView;
		},
		
		initTimeRange: function() {
			this.dataTimeRange.start = Number.MAX_VALUE;
			this.dataTimeRange.end   = -1;
		},

		loadFromLoader: function(loader) {
			this.initTimeRange(); // Set invalid time range at first
			
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
			
			// Copy data from CSV fields to record object
			this.sourceLoader.applyAttributeMapToFieldList(fields, record);
			this.movingData.register(record);
			
			this.updateDataTimeRange(record._time);
		},
		
		updateDataTimeRange: function(t) {
			if (t < this.dataTimeRange.start) {
				this.dataTimeRange.start = t;
			}
			
			if (t > this.dataTimeRange.end) {
				this.dataTimeRange.end = t;
			}
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