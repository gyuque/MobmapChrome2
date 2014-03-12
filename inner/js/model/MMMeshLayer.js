if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MMMeshLayer() {
		this.layerId = mobmap.layerGetNextId();
		this.jElement = $(document.createElement('span'));
		this.ownerList = null;
		this.primaryView = null;
		this.capabilities = mobmap.LayerCapability.MeshRenderable;
		this.dataTimeRange = {
			start: 0,
			end: 0
		};

		this._lvObserved = false;
		this._markerOptions = null;
		this._lctrlObserved = false;
		this.dataReady = false;
		this.sourceLoader = null;
		this.localSelectionPool = new mobmap.SelectionPool();
		
		this.meshData = null;
		this.colorRule = new MMMeshLayer.ColorRule( this.eventDispatcher() );
		this.renderValueRange = {
			min: 0,
			max: 10000
		};

		this.generateDefaultGradient();
	}
	
	MMMeshLayer.RangePreset = [5, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
	MMMeshLayer.COLOR_RULE_CHANGE = "mm-mesh-layer-event-color-rule-change";
	MMMeshLayer.RENDER_VALUE_RANGE_CHANGE = "mm-mesh-layer-event-render-value-range-change";
	
	MMMeshLayer.prototype = {
		eventDispatcher: mobmap.MMLayerBase.eventDispatcher,
		setOwnerList: mobmap.MMLayerBase.setOwnerList,
		setParentEventElement: mobmap.MMLayerBase.setParentEventElement,
		hasPrimaryView: mobmap.MMLayerBase.hasPrimaryView,
		requestDelete: mobmap.MMLayerBase.requestDelete,
		destroy: mobmap.MMLayerBase.destroy,

		setMeshData: function(md) {
			this.meshData = md;
		},

		hasTimeRange: function() {
			if (!this.meshData) { return false; }
			if (!this.meshData.isTimeRangeLengthValid()) { return false; }
			
			return this.meshData.dynamic;
		},

		afterLoadFinish: function() {
			this.meshData.close();
			this.updateDataTimeRange();
			this.dataReady = true;
			this.eventDispatcher().trigger(mobmap.LayerEvent.LoadFinish, this);
		},

		getSourceFileName: function() {
			if (!this.sourceLoader) { return "source unknown"; }
			return this.sourceLoader.fileName;
		},

		getShortDescription: function() {
			var name = this.getSourceFileName();
			return name;
		},
		
		bindOverlay: function(mapOverlay) {
			mapOverlay.bindData(this.meshData);
		},
		
		updateDataTimeRange: function() {
			this.dataTimeRange.start = this.meshData.timeRange.min;
			this.dataTimeRange.end = this.meshData.timeRange.max;
		},
		
		generateDefaultGradient: function() {
			var g = this.colorRule;
			g.clearGradient(true);
			
			var s1 = new MMGradientStop(0, 255,0,0, 0);
			var s2 = new MMGradientStop(1, 255,0,0, 1);
			g.addStop(s1);
			g.addStop(s2);
			g.fire();
		}
	};
	
	MMMeshLayer.ColorRule = function(jEventElement) {
		this.jEventElement = jEventElement;
		this.gradientStops = [];
	};
	
	MMMeshLayer.ColorRule.prototype = {
		clearGradient: function(suppress_event) {
			this.gradientStops.length = 0;
			
			if (!suppress_event) {
				this.fire();
			}
		},
		
		fire: function() {
			this.jEventElement.trigger(MMMeshLayer.COLOR_RULE_CHANGE, this);
		},

		addStop: function(st) {
			this.gradientStops.push(st);
		},
		
		countStops: function() {
			return this.gradientStops.length;
		},
		
		getStopAsHTMLColor: function(index) {
			var s = this.gradientStops[index];
			return makeStyleSheetRGBA(s.r, s.g, s.b, s.a);
		},
		
		getStopPosition: function(index) {
			return this.gradientStops[index].position;
		}
	};
	
	aGlobal.mobmap.MMMeshLayer = MMMeshLayer;
})(window);