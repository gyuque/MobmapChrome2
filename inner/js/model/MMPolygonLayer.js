if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MMPolygonLayer() {
		this.layerId = mobmap.layerGetNextId();
		this.jElement = $( createEventDummyElement() );
		this.ownerList = null;
		this.visible = true;
		this.primaryView = null;
		this.capabilities = mobmap.LayerCapability.PolygonRenderable;

		this._lvObserved = false;
		this._markerOptions = null;
		this._lctrlObserved = false;
		this.dataReady = false;
		this.sourceLoader = null;
	}
	
	MMPolygonLayer.prototype = {
		hasTimeRange: function() {
			return false;
		},
		
		setSourceLoader: function(ldr) {
			this.sourceLoader = ldr;
		},
		
		afterLoadFinish: function() {
			this.dataReady = true;
			this.eventDispatcher().trigger(mobmap.LayerEvent.LoadFinish, this);
		},
		
		getSourceFileName: function() {
			return "not_impl";
		},
		
		getShortDescription: function() {
			return "not_impl";
		}
	};

	mobmap.InstallMMLayerBaseMethods(MMPolygonLayer.prototype);

	aGlobal.mobmap.MMPolygonLayer = MMPolygonLayer;
})(window);