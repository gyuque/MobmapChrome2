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
	}
	
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
		}
	};
	
	aGlobal.mobmap.MMMeshLayer = MMMeshLayer;
})(window);