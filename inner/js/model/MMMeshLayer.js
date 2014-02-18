if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MMMeshLayer() {
		this.jElement = $(document.createElement('span'));
		this.ownerList = null;
		this.primaryView = null;
		this.capabilities = 0;
		this.dataTimeRange = {
			start: 0,
			end: 0
		};

		this._lvObserved = false;
		this._lctrlObserved = false;
		this.dataReady = false;
		this.sourceLoader = null;
		
		this.meshData = null;
	}
	
	MMMeshLayer.prototype = {
		eventDispatcher: mobmap.MMLayerBase.eventDispatcher,
		setOwnerList: mobmap.MMLayerBase.setOwnerList,
		setParentEventElement: mobmap.MMLayerBase.setParentEventElement,
		hasPrimaryView: mobmap.MMLayerBase.hasPrimaryView,
		
		setMeshData: function(md) {
			this.meshData = md;
		},
		
		afterLoadFinish: function() {
			this.meshData.close();
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
		}
	};
	
	aGlobal.mobmap.MMMeshLayer = MMMeshLayer;
})(window);