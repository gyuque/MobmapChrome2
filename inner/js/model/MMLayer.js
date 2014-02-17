if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	var LayerEvent = {
		LoadWillStart: 'mm-layer-model-event-load-will-start',
		LoadProgressChange: 'mm-layer-model-event-load-progress-change',
		LoadFinish: 'mm-layer-model-event-load-progress-finish'
	};
	
	var LayerCapability = {
		MarkerRenderable: 0x01
	};

	function MovingObjectLayer() {
		this.jElement = $(document.createElement('span'));
		this.ownerList = null;
		this.primaryView = null;
		this.capabilities = LayerCapability.MarkerRenderable;
		this.dataTimeRange = {
			start: 0,
			end: 0
		};

		this._lvObserved = false;
		this._lctrlObserved = false;
		
		this.sourceLoader = null;
		this.markerGenerator = new mobmap.MarkerGenerator();
		this.movingData = null;
		this.localSelectionPool = new mobmap.SelectionPool();
		this.dataReady = false;
		
		this.shouldRenderAsPoints = true;
	}


	// Base functions - - - - - - -
	function layerbase_setParentEventElement(parentEventElement) {
		var selfElem = this.jElement[0];
		var cur = selfElem.parentNode;
		if (cur === parentEventElement) { return; }
		if (cur) { cur.removeChild(selfElem); }
		
		parentEventElement.appendChild(selfElem);
	}

	function layerbase_eventDispatcher() {
		return this.jElement;
	}
	
	function layerbase_setOwnerList(ls) {
		this.ownerList = ls;
	}
	
	function layerbase_hasPrimaryView() {
		return !!this.primaryView;
	}

	MovingObjectLayer.prototype = {
		// Common methods
		// Delegate to base functions
		eventDispatcher: layerbase_eventDispatcher,
		setOwnerList: layerbase_setOwnerList,
		setParentEventElement: layerbase_setParentEventElement,
		hasPrimaryView: layerbase_hasPrimaryView,
		
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
		
		getShortDescription: function() {
			var name = this.getSourceFileName();
			if (this.dataReady) {
				return name + " ("+ (this.movingData.countIds()) +" IDs)";
			} else {
				return name + " (? IDs)";
			}
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
			this.dataReady = true;
			this.movingData.close();
			registerAdditionalAttributes(this.movingData, this.sourceLoader.attrMap);
			
			this.eventDispatcher().trigger(LayerEvent.LoadFinish, this);
			//console.log(this.movingData)
		}
	};

	function registerAdditionalAttributes(targetMD, sourceAttrMap) {
		sourceAttrMap.forEachAttribute(function(attrName, meta){
			if (!isMMRequiredAttribute(attrName)) {
				var intp = (meta.dataType === AttributeType.CFLOAT);
				targetMD.addExtraProperty(attrName, intp);
			}
		});
	}

	aGlobal.mobmap.MMLayerBase = {
		eventDispatcher: layerbase_eventDispatcher,
		setOwnerList: layerbase_setOwnerList,
		setParentEventElement: layerbase_setParentEventElement,
		hasPrimaryView: layerbase_hasPrimaryView
	};
	
	aGlobal.mobmap.LayerCapability = LayerCapability;
	aGlobal.mobmap.LayerEvent = LayerEvent;
	aGlobal.mobmap.MovingObjectLayer = MovingObjectLayer;
})(window);