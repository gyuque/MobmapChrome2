if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var gLayerNextId = 1;
	aGlobal.mobmap.layerGetNextId = function() {
		var i = gLayerNextId++;
		return i;
	};

	var LayerEvent = {
		LoadWillStart: 'mm-layer-model-event-load-will-start',
		LoadProgressChange: 'mm-layer-model-event-load-progress-change',
		LoadFinish: 'mm-layer-model-event-load-progress-finish',
		VisibilityChange: 'mm-layer-model-event-visibility-change',
		RequestDelete: 'mm-layer-model-event-request-delete',
		Destroy: 'mm-layer-model-event-destroy'
	};
	
	var LayerCapability = {
		MarkerRenderable: 0x01,
		MeshRenderable  : 0x02,
		SpatialSelectable: 0x10
	};

	function MovingObjectLayer() {
		this.layerId = mobmap.layerGetNextId();
		this.jElement = $( createEventDummyElement() );
		this.ownerList = null;
		this.visible = true;
		this.primaryView = null;
		this.capabilities = LayerCapability.MarkerRenderable | LayerCapability.SpatialSelectable;
		this.dataTimeRange = {
			start: 0,
			end: 0
		};

		this._lvObserved = false;
		this._markerOptions = new mobmap.LayerMarkerOptions();
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
	
	function layerbase_requestDelete() {
		this.eventDispatcher().trigger(LayerEvent.RequestDelete, this);
	}
	
	function layerbase_destroy() {
		this.eventDispatcher().trigger(LayerEvent.Destroy, this);
		layerbase_removeAllEventHandlers.apply(this);
	}

	function layerbase_removeAllEventHandlers() {
		this.eventDispatcher().unbind();
	}
	
	function layerbase_toggleVisibility() {
		var newVal = !this.visible;
		this.setVisibility(newVal);
	}

	function layerbase_setVisibility(v) {
		if (this.visible !== v) {
			this.visible = v;
			this.eventDispatcher().trigger(LayerEvent.VisibilityChange, this);
		}
	}

	// - - - - - - - - - - - - - - - - - - - -

	MovingObjectLayer.prototype = {
		// Common methods
		// Delegate to base functions
		eventDispatcher: layerbase_eventDispatcher,
		setOwnerList: layerbase_setOwnerList,
		setParentEventElement: layerbase_setParentEventElement,
		hasPrimaryView: layerbase_hasPrimaryView,
		requestDelete: layerbase_requestDelete,
		destroy: layerbase_destroy,
		toggleVisibility: layerbase_toggleVisibility,
		setVisibility: layerbase_setVisibility,
		
		initTimeRange: function() {
			this.dataTimeRange.start = Number.MAX_VALUE;
			this.dataTimeRange.end   = -1;
		},
		
		hasTimeRange: function() {
			return true;
		},

		loadFromLoader: function(loader) {
			this.initTimeRange(); // Set invalid time range at first
			
			this.sourceLoader = loader;
			this.newMovingData();

			this.eventDispatcher().trigger(LayerEvent.LoadWillStart, this);
			loader.startFullLoad(this);
		},
		
		newMovingData: function() {
			this.movingData = new mobmap.MovingData();
			return this.movingData;
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
			this.registerNewMovingObjectRecord(record);
		},
		
		registerNewMovingObjectRecord: function(record) {
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
			this.finishLoading();
		},
		
		finishLoading: function() {
			this.dataReady = true;
			this.movingData.close();
			
			if (this.sourceLoader.attrMap) {
				registerAdditionalAttributes(this.movingData, this.sourceLoader.attrMap);
			}

			this.eventDispatcher().trigger(LayerEvent.LoadFinish, this);
		},
		
		getNumOfMarkerVariations: function() {
			return this.markerGenerator.options.nVariations;
		},
		
		mapAttributeToMarkerIndex: function(attrRawValue) {
			var i = parseInt(attrRawValue, 10);
			var n = this.getNumOfMarkerVariations();
			
			if (i >= n) { i = n - 1; }
			if (i < 0) { i = 0; }

			return i;
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
		hasPrimaryView: layerbase_hasPrimaryView,
		requestDelete: layerbase_requestDelete,
		destroy: layerbase_destroy,
		toggleVisibility: layerbase_toggleVisibility,
		setVisibility: layerbase_setVisibility
	};
	
	aGlobal.mobmap.LayerCapability = LayerCapability;
	aGlobal.mobmap.LayerEvent = LayerEvent;
	aGlobal.mobmap.MovingObjectLayer = MovingObjectLayer;
})(window);