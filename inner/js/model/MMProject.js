if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function MMProject() {
		var eventElement = createEventDummyElement();
		this.jElement = $( eventElement );
		this.layerList = new LayerList(this.jElement[0], this);
		this.currentDateTime = new mobmap.DateTime();
		this.timeRangeSelection = new mobmap.TimeRangeSelection();

		this.annotationList = new mobmap.MMAnnotationList();
		this.annotationList.setParentEventElement(eventElement);
	}
	
	MMProject.LAYERLIST_CHANGE = "mmprj-event-layerlist-change";
	MMProject.LAYERLIST_ORDER_SWAP = "mmprj-event-layerlist-order-swap";
	MMProject.LAYERLIST_SWAP_FAIL = "mmprj-event-layerlist-swap-fail";
	
	MMProject.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		getLayerList: function() {
			return this.layerList;
		},
		
		getLayerById: function(layerId) {
			var ls = this.getLayerList();
			if (!ls) { return null; }
			
			return ls.getLayerById(layerId);
		},
		
		moveDownLayer: function(targetLayer) {
			var ls = this.getLayerList();
			var li = ls.findLayerIndex(targetLayer);

			if (li < 1) {
				// This layer is on the bottom
				this.notifySwapFail(li, -1);
				return;
			}
			
			if (!!(ls.getLayerAt(li-1).capabilities & mobmap.LayerCapability.FixOnBottom)) {
				// Previous layer is fixed.
				this.notifySwapFail(li, -1);
				return;
			}
			
			ls.swapLayer(li, li-1);
			this.eventDispatcher().trigger(MMProject.LAYERLIST_ORDER_SWAP, [this, li, li-1]);
		},
		
		moveUpLayer: function(targetLayer) {
			var is_fixed = !!(targetLayer.capabilities & mobmap.LayerCapability.FixOnBottom);
			
			var ls = this.getLayerList();
			var li = ls.findLayerIndex(targetLayer);
			if (li < 0 || li >= (ls.getCount()-1) || is_fixed) {
				this.notifySwapFail(li, 1);
				return;
			}
			
			this.getLayerList().swapLayer(li+1, li);
			this.eventDispatcher().trigger(MMProject.LAYERLIST_ORDER_SWAP, [this, li+1, li]);
		},
		
		notifySwapFail: function(layerIndex, direction) {
			if (layerIndex >= 0) {
				this.eventDispatcher().trigger(MMProject.LAYERLIST_SWAP_FAIL, [this, layerIndex, direction]);
			}
		},
		
		getCurrentTimeInSeconds: function() {
			var d = this.currentDateTime;
			return d.getCurrentTime();
		},

		addMovingObjectLayer: function(additionalCapFlag, bRemote) {
			var lyr = new mobmap.MovingObjectLayer();
			lyr.remote = !!bRemote;
			if (additionalCapFlag) {
				lyr.capabilities |= additionalCapFlag;
			}
			
			this.appendLayerAndNotify(lyr);
			return lyr;
		},
		
		addPolygonLayer: function() {
			var lyr = new mobmap.MMPolygonLayer();
			this.appendLayerAndNotify(lyr);
			return lyr;
		},
		
		addMeshLayer: function() {
			var lyr = new mobmap.MMMeshLayer();
			this.appendLayerAndNotify(lyr);
			return lyr;
		},
		
		addExploreLayer: function() {
			var lyr = new mobmap.MMExploreLayer();
			this.insertBottomLayerAndNotify(lyr);
			return lyr;
		},
		
		appendLayerAndNotify: function(lyr) {
			this.layerList.appendOnTop(lyr);
			this.triggerEvent(MMProject.LAYERLIST_CHANGE);
			return lyr;
		},
		
		insertBottomLayerAndNotify: function(lyr) {
			this.layerList.insertToBottom(lyr);
			this.triggerEvent(MMProject.LAYERLIST_CHANGE);
			return lyr;
		},
		
		removeLayerAndNotify: function(lyr) {
			if (this.layerList.removeLayer(lyr)) {
				lyr.destroy();
				this.triggerEvent(MMProject.LAYERLIST_CHANGE);
			}
		},
		
		triggerEvent: function(eventType) {
			this.eventDispatcher().trigger(eventType, this);
		},
		
		getAllLayersTimeRange: function() {
			var start_t = Number.MAX_VALUE;
			var end_t   = -1;
			
			var len = this.layerList.getCount();
			for (var i = 0;i < len;++i) {
				var lyr = this.layerList.getLayerAt(i);

				if (lyr.hasTimeRange()) {
					var st = lyr.dataTimeRange.start + lyr.getDataOffset();
					var ed = lyr.dataTimeRange.end + lyr.getDataOffset();
					if (st < start_t) { start_t = st; }
					if (ed > end_t) { end_t = ed; }
				}
			}

			return {
				start: start_t,
				end: end_t
			};
		},
		
		forEachLayer: function(proc) {
			var len = this.layerList.getCount();
			for (var i = 0;i < len;++i) {
				proc(i, this.layerList.getLayerAt(i) );
			}
		}
	};
	
	// ---------------------------
	function LayerList(parentEventElement, ownerProject) {
		// From bottom to top
		this.array = [];
		this.parentEventElement = parentEventElement;
		this.ownerProject = ownerProject;
	}
	
	LayerList.prototype = {
		getCount: function() {
			return this.array.length;
		},
		
		getLayerAt: function(i) {
			return this.array[i] || null;
		},
		
		getLayerById: function(layerId) {
			var ls = this.array;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				if (ls[i].layerId === layerId) {
					return ls[i];
				}
			}
			
			return null;
		},
		
		findLayerIndex: function(layerObj) {
			return this.array.indexOf(layerObj);
		},
		
		appendOnTop: function(newLayer) {
			this.insertNewLayer(newLayer);
		},
		
		insertToBottom: function(newLayer) {
			this.insertNewLayer(newLayer, true);
		},
		
		insertNewLayer: function(newLayer, toBottom) {
			if (this.alreadyExists(newLayer)) {
				return false;
			}

			newLayer.setOwnerList(this);
			newLayer.setParentEventElement(this.parentEventElement);
			
			if (toBottom) {
				this.array.unshift(newLayer);
			} else {
				// on top
				this.array.push(newLayer);
			}
			
			console.log("Number of layers: ", this.array.length);
			return true;
		},
		
		alreadyExists: function(lyr) {
			for (var i = 0;i < this.array.length;++i) {
				if (this.array[i] === lyr) {
					return true;
				}
			}
			
			return false;
		},
		
		removeLayer: function(targetLayer) {
			var i = this.array.indexOf(targetLayer);
			if (i < 0) {return false;}
			
			this.array.splice(i, 1);
			
			return true;
		},
		
		swapLayer: function(i1, i2) {
			var old1 = this.array[i1];
			this.array[i1] = this.array[i2];
			this.array[i2] = old1;
		},
		
		countExploreLayers: function() {
			return this.countLayersWithCapabilities(mobmap.LayerCapability.ExploreOtherLayer);
		},

		countMovingObjectLayers: function() {
			return this.countLayersWithCapabilities(mobmap.LayerCapability.MarkerRenderable);
		},
		
		countLayersWithCapabilities: function(mask) {
			var count = 0;
			for (var i in this.array) {
				if (0 !== (this.array[i].capabilities & mask)) {
					++count;
				}
			}
			
			return count;
		}
	};
	// ----------------------------
	
	// +++ Export +++
	aGlobal.mobmap.MMProject = MMProject;
})(window);