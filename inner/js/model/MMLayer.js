if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var gLayerNextId = 1;
	aGlobal.mobmap.layerGetNextId = function() {
		var i = gLayerNextId++;
		return i;
	};
	
	aGlobal.mobmap.DataOptionChangeFlag_TimeOffset = 0x1;

	var LayerEvent = {
		LoadWillStart: 'mm-layer-model-event-load-will-start',
		BodyLoadStarted: 'mm-layer-model-event-body-load-started',
		LoadProgressChange: 'mm-layer-model-event-load-progress-change',
		LoadFinish: 'mm-layer-model-event-load-progress-finish',
		LoadError: 'mm-layer-model-event-load-error',
		DownloadError: 'mm-layer-model-event-download-error',
		DownloadProgress: 'mm-layer-model-event-download-progress',
		DataChange: 'mm-layer-model-event-data-change',
		DataSchemaChange: 'mm-layer-model-event-data-schema-change',
		DataOptionChange: 'mm-layer-model-event-data-option-change',
		VisibilityChange: 'mm-layer-model-event-visibility-change',
		RequestDelete: 'mm-layer-model-event-request-delete',
		RequestGoDown: 'mm-layer-model-event-request-go-down',
		RequestGoUp: 'mm-layer-model-event-request-go-up',
		RequestRemoteRefresh: 'mm-layer-model-event-request-remote-refresh',
		Destroy: 'mm-layer-model-event-destroy',
		ExploreTargetSet: 'mm-layer-model-event-explore-target-set',
		ExploreViewTypeChange: 'mm-layer-model-event-explore-viewtype-change',
		ExploreViewOptionChange: 'mm-layer-model-event-explore-viewoption-change',
		ExploreTargetSelectionChange: 'mm-layer-model-event-explore-target-selection-change',
		ExploreTargetDataChange: 'mm-layer-model-event-explore-target-data-change'
	};
	
	var LayerCapability = {
		MarkerRenderable: 0x01,
		MeshRenderable  : 0x02,
		TyphoonMarkerRecommended: 0x04,
		PolygonRenderable  : 0x08,
		SpatialSelectable: 0x10,
		PolygonSelectable: 0x20,
		FixOnBottom: 0x100,
		ExploreOtherLayer: 0x200,
		StaticData: 0x400,
		StatOtherLayer: 0x800
	};

	function MovingObjectLayer() {
		this.layerId = mobmap.layerGetNextId();
		this.jElement = $( createEventDummyElement() );
		this.ownerList = null;
		this.visible = true;
		this.remote = false;
		this.primaryView = null;
		this.capabilities = LayerCapability.MarkerRenderable | LayerCapability.SpatialSelectable;
		this.dataTimeRange = new MovingObjectLayer.DataTimeRange();

		this._lvObserved = false;
		this._markerOptions = new mobmap.LayerMarkerOptions();
		this._markerOptions.setParentEventElement(this.jElement[0]);
		this._lctrlObserved = false;

		this.sourceLoader = null;
		this.markerGenerator = new mobmap.MarkerGenerator();
		this.markerGenerator.setParentEventElement(this.jElement[0]);
		this.movingData = null;
		this.mdataRemainSides = true;
		this.mdataOffset = 0;
		this.attributeMapping = null;
		this.tp_count_cache = -1;
		this.localSelectionPool = new mobmap.SelectionPool();
		this.dataReady = false;

		this.shouldRenderAsPoints = true;
		this.typhoonMarkerOptions = {
			showCloud: true
		};
	}

	MovingObjectLayer.DataTimeRange = function() {
		this.start = 0;
		this.end   = 0;
	};

	// Base functions - - - - - - -
	function layerbase_setParentEventElement(parentEventElement) {
		replaceParentEventElement(this.jElement[0], parentEventElement);
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
	
	function layerbase_requestGoDown() { this.eventDispatcher().trigger(LayerEvent.RequestGoDown, this); }
	function layerbase_requestGoUp() { this.eventDispatcher().trigger(LayerEvent.RequestGoUp, this); }
	
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
	
	function layerbase_getDataOffset() {
		return this.mdataOffset || 0;
	}


	aGlobal.mobmap.MMLayerBase = {
		eventDispatcher: layerbase_eventDispatcher,
		setOwnerList: layerbase_setOwnerList,
		setParentEventElement: layerbase_setParentEventElement,
		hasPrimaryView: layerbase_hasPrimaryView,
		requestDelete: layerbase_requestDelete,
		requestGoDown: layerbase_requestGoDown,
		requestGoUp:   layerbase_requestGoUp,
		destroy: layerbase_destroy,
		toggleVisibility: layerbase_toggleVisibility,
		setVisibility: layerbase_setVisibility,
		getDataOffset: layerbase_getDataOffset
	};

	aGlobal.mobmap.InstallMMLayerBaseMethods = function(targetPrototype) {
		var base = aGlobal.mobmap.MMLayerBase;
		for (var i in base) if (base.hasOwnProperty(i)) {
			targetPrototype[i] = base[i];
		}
	};

	// - - - - - - - - - - - - - - - - - - - -

	MovingObjectLayer.prototype = {
		initTimeRange: function() {
			this.dataTimeRange.start = Number.MAX_VALUE;
			this.dataTimeRange.end   = -1;
		},
		
		hasTimeRange: function() {
			return true;
		},

		enumerateIDs: function(proc) {
			var ls = this.movingData.getFlattenTLArray();
			for (var i = 0;i < ls.length;++i) {
				proc(ls[i].id);
			}
		},

		loadFromLoader: function(loader) {
			this.initTimeRange(); // Set invalid time range at first
			
			this.sourceLoader = loader;
			this.newMovingData(loader);

			this.eventDispatcher().trigger(LayerEvent.LoadWillStart, this);
			loader.startFullLoad(this);
		},
		
		newMovingData: function(loader) {
			if (loader) {
				// Create suitable object for the loader
				this.movingData = loader.createDataObject();
			} else {
				this.movingData = new mobmap.MovingData();
			}

			return this.movingData;
		},
		
		addAttribute: function(name, valType, initType) {
			if (!this.movingData) { return false;}
			
			var emptyVal = 0;
			if (valType ===  AttributeType.STRING) {
				emptyVal = '';
			}
			
			if (this.movingData.addAttributeAfterLoad(name, (valType === AttributeType.CFLOAT), initType, emptyVal, valType )) {
				if (this.attributeMapping) {
					this.attributeMapping.addAttributeAfterLoad(name, valType);
				}

				this.eventDispatcher().trigger(LayerEvent.DataSchemaChange, [this, name]);
			}
	
			return true;
		},
		
		setRemainSides: function(newValue) {
			newValue = !!(newValue);

			if (this.mdataRemainSides !== newValue) {
				this.mdataRemainSides = newValue;
				this.movingData.setRemainSidesMode(newValue);

				this.eventDispatcher().trigger(LayerEvent.DataOptionChange, [this, 0]);
			}
		},
		
		setDataOffset: function(seconds) {
			seconds |= 0;
			
			if (this.mdataOffset !== seconds) {
				this.mdataOffset = seconds;
				this.movingData.pickOffset = -this.mdataOffset;
				this.eventDispatcher().trigger(LayerEvent.DataOptionChange, [this, mobmap.DataOptionChangeFlag_TimeOffset]);
			}
		},

		setAttributeMapping: function(a) {
			this.attributeMapping = a;
		},

		getSourceFileName: function() {
			if (!this.sourceLoader) {
				return "unknown";
			}
			
			return this.sourceLoader.fileName;
		},
		
		getShortDescription: function() {
			var name = this.getSourceFileName();
			if (this.dataReady) {
				var n = this.movingData.countIds();
				var postfix = (n > 1) ? " IDs)" : " ID)";
				return name + " ("+ n + postfix;
			} else {
				return name + " (? IDs)";
			}
		},
		
		setTyphoonMarkerOptionShowCloud: function(s) {
			if (this.typhoonMarkerOptions.showCloud !== s) {
				this.typhoonMarkerOptions.showCloud = s;
				this.fireMarkerOptionsChange();
			}
		},
		
		fireMarkerOptionsChange: function() {
			this._markerOptions.fire();
		},
		
		requestRemoteRefresh: function() {
			this.eventDispatcher().trigger(LayerEvent.RequestRemoteRefresh, this);
		},
		
		// CSV Loader Listener functions <<<<<<<<<<<<<<<<<
		
		csvloaderReadLine: function(fields, lineno) {
			var all = this.sourceLoader.countLines();
			if (all === 0) { all = 1; }
			
			if (lineno === 1) {
				this.eventDispatcher().trigger(LayerEvent.BodyLoadStarted, this);
			}
			
			var rat = lineno / all;
			if ((lineno % 100) === 0 || rat > 0.999999) {
				this.eventDispatcher().trigger(LayerEvent.LoadProgressChange, rat);
			}
			
			// Write field values to new record
			var record = this.sourceLoader.processDataFields(fields, lineno, this.movingData);
			if (record) { // record may be null when the line is not data body
				this.registerNewMovingObjectRecord(record);
			}
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
			console.log(this.sourceLoader);
			console.log("Loader error at MMLayer#csvloaderLineError", e)
			this.eventDispatcher().trigger(LayerEvent.LoadError, this);
		},
		
		csvloaderDownloadError: function(e) {
			this.eventDispatcher().trigger(LayerEvent.DownloadError, this);
		},

		csvloaderDownloadProgress: function(loadedBytes) {
			this.eventDispatcher().trigger(LayerEvent.DownloadProgress, [this, loadedBytes]);
		},

		csvloaderLoadFinish: function() {
			this.finishLoading();
		},
		
		finishLoading: function() {
			this.dataReady = true;
			this.movingData.close();
			
			if (this.sourceLoader.attrMap) {
				registerAdditionalAttributes(this.movingData, this.sourceLoader.attrMap);
				this.setAttributeMapping(this.sourceLoader.attrMap);
			}

			this.eventDispatcher().trigger(LayerEvent.LoadFinish, this);
		},
		
		getNumOfMarkerVariations: function() {
			return this.markerGenerator.options.nVariations;
		},
		
		mapAttributeToMarkerIndex: function(attrRawValue) {
			var i;
			var n = this.getNumOfMarkerVariations();
			
			var mo = this._markerOptions;
			if (mo.indexMap.enabled) {
				i = mo.indexMap.mapValue(attrRawValue);
			} else {
				i = parseInt(attrRawValue, 10);
			}
			
			if (i >= n) { i = n - 1; }
			else if (i < 0) { i = 0; }

			return i;
		},
		
		getMarkerColorByIndex: function(markerIndex) {
			var ls = this.markerGenerator.lastBaseColorList;
			if (!ls) { return null; }
			
			return ls[markerIndex] || null;
		},

		exportMarkerColoringInfo: function() {
			var xmap = null;
			if (this.movingData) {
				xmap = this.movingData.cloneExtraProperties();
			}
			
			var retObj = {
				indexMap: this.getIndexMapHash(),
				extraAttributesMap: xmap,
				baseColorList: this.markerGenerator.lastBaseColorList,
				boundAttribute: this._markerOptions.boundAttributeName,
				varyingType: this._markerOptions.varyingType
			};
			
			return retObj;
		},

		getIndexMapHash: function() {
			var mo = this._markerOptions;
			if (mo && mo.indexMap && mo.indexMap.enabled) {
				return mo.indexMap.rawToIndexMap || null;
			}
			
			return null;
		},

		// Polyline datasource API
		
		tpCountPolylines: function() {
			if (this.tp_count_cache < 0) {
				this.tp_count_cache = this.movingData.countIds()
			}
			
			return this.tp_count_cache;
		},
		
		tpCountVerticesOfPolyline: function(polylineIndex) {
			var md = this.movingData;
			if (!md) { return 0;}
			
			var tls = md.getFlattenTLArray();
			return tls[polylineIndex].countTrajectoryVertices();
		},
		
		tpGetVertexLatitude: function(polylineIndex, vertexIndex) {
			var tls = this.movingData.getFlattenTLArray();
//			var recs = tls[polylineIndex].getRecordList();
//			var rc = recs[vertexIndex];
			
			var rc = tls[polylineIndex].getTrajectoryVertexAt(vertexIndex);			
			return rc ? rc.y : null;
		},

		tpGetVertexLongitude: function(polylineIndex, vertexIndex) {
			var tls = this.movingData.getFlattenTLArray();
//			var recs = tls[polylineIndex].getRecordList();
//			var rc = recs[vertexIndex];

			var rc = tls[polylineIndex].getTrajectoryVertexAt(vertexIndex);			
			return rc ? rc.x : null;
		},
		
		tpGetVertexTimestamp: function(polylineIndex, vertexIndex) {
			var tls = this.movingData.getFlattenTLArray();
//			var recs = tls[polylineIndex].getRecordList();
			
			return tls[polylineIndex].getTrajectoryVertexAttributeAt(vertexIndex, '_time', this.movingData.extraProps);
			
			// Todo: replace with abstract function
//			return recs[vertexIndex]._time + this.mdataOffset;
		},

		tpGetOwnerObjectId: function(polylineIndex) {
			var tls = this.movingData.getFlattenTLArray();
			
			return tls[polylineIndex].stringId;
		},
		
		tpGetMarkerBoundColor: function(objId, stopIndex) {
			var tl = this.movingData.getTimeListOfId(objId);
			if (!tl) {
				return null;
			}
			
			var record = (tl.getRecordList())[stopIndex] || null;
			if (!record) {
				return null;
			}

			var markerIndex = this.getMarkerIndexForRecord(record);
			var baseColorList = this.markerGenerator.lastBaseColorList;
			if (!baseColorList) {
				return null;
			} else {
				if (markerIndex < 0) { markerIndex = 0; }
				else if (markerIndex >= baseColorList.length) { markerIndex = baseColorList.length-1; }
			}

			return baseColorList[markerIndex] || null;
		},
	
		getMarkerIndexForRecord: function(rec) {
			if (!rec) { return null; }

			var markerIndex = 0;
			if (this._markerOptions.varyingType === mobmap.LayerMarkerOptions.MV_ATTR) {
				markerIndex = this.mapAttributeToMarkerIndex(rec[this._markerOptions.boundAttributeName]);
				//markerIndex = rec[this._markerOptions.boundAttributeName] || 0;
			}
			
			return markerIndex;
		},
		
		fillValueAllTime: function(attrName, newValue, useSelection) {
			var selp = this.localSelectionPool;
			var checkSel = useSelection && selp.isAnySelected();
			
			var mdat = this.movingData;
			var idMap = mdat.idMap;
			var convertedValue = this.attributeMapping.convertToColumnTypeWithAttributeName(attrName, newValue); 
			
			for (var objId in idMap) {
				if (checkSel) {
					if (!selp.isIDSelected(objId)) {
						continue;
					}
				}

				var tl = mdat.getTimeListOfId(objId);
				tl.fillValue(attrName, convertedValue);
			}
			
			this.fireDataChange();
		},
		
		fireDataChange: function() {
			this.eventDispatcher().trigger(LayerEvent.DataChange, this);
		}
	};

	mobmap.InstallMMLayerBaseMethods(MovingObjectLayer.prototype);

	function registerAdditionalAttributes(targetMD, sourceAttrMap) {
		sourceAttrMap.forEachAttribute(function(attrName, meta){
			if (!isMMRequiredAttribute(attrName)) {
				var intp = (meta.dataType === AttributeType.CFLOAT);
				targetMD.addExtraProperty(attrName, intp);
			}
		});
	}

	
	aGlobal.mobmap.LayerCapability = LayerCapability;
	aGlobal.mobmap.LayerEvent = LayerEvent;
	aGlobal.mobmap.MovingObjectLayer = MovingObjectLayer;
})(window);