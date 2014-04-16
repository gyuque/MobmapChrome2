if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MMExploreLayer() {
		this.layerId = mobmap.layerGetNextId();
		this.jElement = $(document.createElement('span'));
		this.overlayViewType = mobmap.ExploreMapType.ViewType.Trajectory;
		this.ownerList = null;
		this.visible = true;
		this.primaryView = null;
		this.capabilities = mobmap.LayerCapability.FixOnBottom | mobmap.LayerCapability.ExploreOtherLayer;
		this.dataTimeRange = {
			start: 0,
			end: 0
		};
		
		this._lvObserved = false;
		this._markerOptions = null;
		this._lctrlObserved = false;
		this.dataReady = false;
		this.sourceLoader = null;
		
		this.targetLayerId = -1;
		this.targetObjectIds = [];
		this.trajectoryDefaultColor = '#ff0';
		this.trajectoryAddComposition = false;
		this.trajectoryColoringMode = MMExploreLayer.TrajectoryColoring.Fixed;
	}
	
	MMExploreLayer.TrajectoryColoring = {
		Fixed: 0,
		Speed: 1
	};
	
	MMExploreLayer.prototype = {
		hasTimeRange: function() {
			return false;
		},
		
		setTargetLayerId: function(layer_id) {
			if (this.targetLayerId !== layer_id) {
				this.targetLayerId = layer_id;
				this.fireTargetSet(layer_id);
			}
		},
		
		setOverlayViewType: function(v) {
			if (this.overlayViewType === v) {
				return;
			}
			
			this.overlayViewType = v;
			this.eventDispatcher().trigger(mobmap.LayerEvent.ExploreViewTypeChange, [this, v]);
		},

		fireTargetSet: function(newTargetId) {
			this.eventDispatcher().trigger(mobmap.LayerEvent.ExploreTargetSet, [this, newTargetId]);
		},

		fireViewOptionChange: function() {
			this.eventDispatcher().trigger(mobmap.LayerEvent.ExploreViewOptionChange, this);
		},

		updateSelectedObjects: function(sourceLayer) {
			if (sourceLayer && this.targetLayerId === sourceLayer.layerId) {
				this.clearTargetObjects();
				this.fetchTargetObjectIds(sourceLayer);
			}
		},
		
		clearTargetObjects: function() {
			this.targetObjectIds.length = 0;
		},
		
		fetchTargetObjectIds: function(sourceLayer) {
			var selp = sourceLayer.localSelectionPool;
			selp.pushIDsToArray(this.targetObjectIds);
			this.eventDispatcher().trigger(mobmap.LayerEvent.ExploreTargetSelectionChange, this);
		},
		
		getTargetSelectedIDList: function() {
			return this.targetObjectIds;
		},
		
		setTrajectoryDefaultColor: function(c) {
			if (this.trajectoryDefaultColor !== c) {
				this.trajectoryDefaultColor = c;
				this.fireViewOptionChange();
			}
		},
		
		setTrajectoryAddComposition: function(enabled) {
			if (this.trajectoryAddComposition !== enabled) {
				this.trajectoryAddComposition = enabled;
				this.fireViewOptionChange();
			}
		},
		
		setTrajectoryColoringMode: function(m) {
			if (this.trajectoryColoringMode !== m) {
				this.trajectoryColoringMode = m;
				this.fireViewOptionChange();
			}
		}
	};
	
	mobmap.InstallMMLayerBaseMethods(MMExploreLayer.prototype);
	aGlobal.mobmap.MMExploreLayer = MMExploreLayer;
})(window);