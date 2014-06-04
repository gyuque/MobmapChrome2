if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MMPolygonLayer() {
		this.layerId = mobmap.layerGetNextId();
		this.jElement = $( createEventDummyElement() );
		this.ownerList = null;
		this.visible = true;
		this.primaryView = null;
		this.capabilities = 
		 mobmap.LayerCapability.PolygonRenderable |
		 mobmap.LayerCapability.PolygonSelectable | 
		 mobmap.LayerCapability.StaticData;

		this._lvObserved = false;
		this._markerOptions = null;
		this._lctrlObserved = false;
		this.dataReady = false;
		this.sourceLoader = null;
		this.localSelectionPool = new mobmap.SelectionPool();
	}
	
	MMPolygonLayer.prototype = {
		hasTimeRange: function() {
			return false;
		},
		
		getPolygonDataSource: function() {
			return this.sourceLoader;
		},
		
		setSourceLoader: function(ldr) {
			this.sourceLoader = ldr;
		},
		
		afterLoadFinish: function() {
			this.dataReady = true;
			this.eventDispatcher().trigger(mobmap.LayerEvent.LoadFinish, this);
		},
		
		getSourceFileName: function() {
			if (!this.sourceLoader) {
				return "unknown";
			}
			
			return this.sourceLoader.fileName;
		},

		generateCountLabel: function() {
			var n = 0;
			var postfix = ' polygon)';
			if (this.sourceLoader) {
				n = this.sourceLoader.getNumOfPolygons();
				if (n > 1) {
					postfix = ' polygons)';
				}
			}
			
			return '(' + n + postfix;
		},

		getShortDescription: function() {
			return this.getSourceFileName() +' '+ this.generateCountLabel();
		},
		
		bindOverlay: function(mapOverlay) {
			mapOverlay.setDataSource(this.getPolygonDataSource());
		},
		
		pickPolygonByPoint: function(lat, lng) {
			var selp = this.localSelectionPool;
			var ds = this.getPolygonDataSource();
			
			var sel_changed = false;
			var idmap = selp.idmap;

			var n = ds.getNumOfPolygons();
			for (var i = 0;i < n;++i) {
				var pg = ds.getPolygonAt(i);
				if (pg.checkLatLngContained(lat, lng)) {
					var pid = pg.getId();
					if (!idmap[pid]) {
						selp.addId(pid, true);
						sel_changed = true;
					}
				}
			}
			
			if (sel_changed) {
				selp.fire();
			}
		}
	};

	mobmap.InstallMMLayerBaseMethods(MMPolygonLayer.prototype);

	aGlobal.mobmap.MMPolygonLayer = MMPolygonLayer;
})(window);