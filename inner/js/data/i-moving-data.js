if (!window.mobmap) window.mobmap={};

(function(pkg) {
	'use strict';
	var PROP_INTERPOLATE = 0x1;
	var kTLOriginalIndexKey = ',tl-original-index,';

	function IndexedMovingData() {
		this.pickOffset = 0;
		this.idMap = createCleanHash();
		this.tlList = null;

		this.extraProps = createCleanHash();
		
		// Buffers for network
		this.latArray = [];
		this.lngArray = [];
		this.polylineArray = [];
		this.networkArray = [];
	}
	
	IndexedMovingData.prototype = {
		// Register API ---------------------------------
		// (Network)
		addVertex: function(lat, lng) {
			this.latArray.push(lat);
			this.lngArray.push(lng);
		},
		
		addPolyline: function(index_array) {
			this.polylineArray.push(index_array);
		},
		
		addNetwork: function(pl_index_array) {
			var nt = new PolylineNetwork(this, pl_index_array);
			this.networkArray.push(nt);
		},
		
		// (Moving object)
		// override
		register: function(record) {
			if (mobmap.MovingData.isInvalidProp(record, '_time') ||
			    mobmap.MovingData.isInvalidProp(record, '_id')) {
				throw "Record must have _time and _id";
			}
		
			record._time = record._time | 0;
		
			var objId = record._id;
			var timeList = this.ensureId(objId);
			definePropertiesForIndexedMovingDataRecord(this.getNetworkAt(record._network), record);
			timeList.addRecord(record);
			/*
			console.log("time:", record._time);
			console.log("x:", record.x);
			console.log("y:", record.y);*/
		},

		// Geometric API
		countVerticesOfPolyline: function(plIndex) {
			var a = this.polylineArray[plIndex];
			return a ? a.length : 0;
		},
		
		calcLengthOfPolyline: function(plIndex) {
			var a = this.polylineArray[plIndex];
			if (!a) { return 0; }
			if (a.length < 2) { return 0; }
			
			var sum = 0;
			var len = a.length;
			for (var i = 0;i < (len-1);++i) {
				var i1 = a[i  ];
				var i2 = a[i+1];

				var distance = calcDistanceFromLatLng(this.lngArray[i1], this.latArray[i1], this.lngArray[i2], this.latArray[i2]);
				sum += distance;
			}
			
			return sum;
		},
		
		getNetworkAt: function(i) {
			return this.networkArray[i];
		},
		
		getLatitudeOnPolyline: function(plIndex, vIndex) {
			return this.getVertexAttributeOnPolyline(plIndex, vIndex, this.latArray);
		},

		getLongitudeOnPolyline: function(plIndex, vIndex) {
			return this.getVertexAttributeOnPolyline(plIndex, vIndex, this.lngArray);
		},
		
		getVertexAttributeOnPolyline: function(plIndex, vIndex, sourceArray) {
			var pl = this.polylineArray[plIndex];
			if (!pl) { return null; }
			if (vIndex < 0 || vIndex >= pl.length) {return null;}
			
			var vi = pl[vIndex];
			return sourceArray[vi];
		},
		
		// Internal funcs -------------------------------
		createTimeList: function(objId) {
			var tl = new mobmap.MovingData.TimeList(objId);
			
			tl.pickIntpRecord = makeIntpRecordWithNetwork;
			tl.close = closeNetworkedRecordsTimeList;
			
			return tl;
		}
	};
	
	mobmap.MovingData.installCompatibleMethods(IndexedMovingData.prototype); 
	
	function definePropertiesForIndexedMovingDataRecord(network, record) {
		Object.defineProperty(record, "_network_object", {
			value: network
		});

		Object.defineProperty(record, "x", {
			get: indexedXGetter
		});

		Object.defineProperty(record, "y", {
			get: indexedYGetter
		});
	}

	function indexedXGetter() {
		return this._network_object.pickLocation(this._ratio, false);
	}

	function indexedYGetter() {
		return this._network_object.pickLocation(this._ratio, true);
	}
	
	function countMidPointsFunc(nextRecord) {
		return this._network_object.countMidPointBetween(this._ratio, nextRecord._ratio);
	}

	function PolylineNetwork(owner, indices) {
		this.owner = owner;
		this.indices = indices;
		this.nCombinedVertices = this.countVertices();
		
		console.log(':: ', this.nCombinedVertices);
		
		this.ratioCache = new Float32Array( this.nCombinedVertices );
		this.pliCache   = new Uint32Array( this.nCombinedVertices );
		this.viCache    = new Uint16Array( this.nCombinedVertices );
		this.buildCache();
	}
	
	PolylineNetwork.prototype = {
		buildCache: function() {
			var entire = this.calcEntireLength();
			var cumIndex = 0;
			var cumDistance = 0;
			
			var oldLat = null;
			var oldLng = null;

			for (var i in this.indices) {
				var pl_index = this.indices[i];
				var nVertices = this.owner.countVerticesOfPolyline(pl_index);
				
				for (var j = 0;j < nVertices;++j) {
					if ( (i-0) !== 0 && j === 0 ) {
						continue;
						// Share with previous vertex
					}

					this.pliCache[cumIndex] = pl_index;
					this.viCache[cumIndex] = j;
					
					var lat = this.owner.getLatitudeOnPolyline(pl_index, j);
					var lng = this.owner.getLongitudeOnPolyline(pl_index, j);
					
					if (cumIndex > 0) {
						var d = calcDistanceFromLatLng(lng, lat, oldLng, oldLat);
						cumDistance += d;
						this.ratioCache[cumIndex] = cumDistance / entire;
					} else {
						this.ratioCache[cumIndex] = 0;
					}
					
					oldLat = lat;
					oldLng = lng;
					
					++cumIndex;
				}
			}
			
		},
		
		calcEntireLength: function() {
			var sum = 0;
			for (var i in this.indices) {
				var pl_index = this.indices[i];
				sum += this.owner.calcLengthOfPolyline(pl_index);
			}

			return sum;
		},
		
		countVertices: function() {
			var sum = 0;
			
			for (var i in this.indices) {
				var pl_index = this.indices[i];
				var n = this.owner.countVerticesOfPolyline(pl_index);

				if ((i-0) === 0) {
					sum += n;
				} else {
					sum += (n-1);
				}
			}
			
			return sum;
		},
		
		pickLocation: function(ratio, is_y) {
			var rc = this.ratioCache;
			var len = rc.length;
			for (var i = 0;i < len;++i) {
				if (rc[i] > ratio) { break; }
			}

			if (i === 0) {
				return this.getVertexAttributeByIndices(this.pliCache[0], this.viCache[0], is_y);
			} else if (i === len) {
				var lastI = this.nCombinedVertices - 1;
				return this.getVertexAttributeByIndices(this.pliCache[lastI], this.viCache[lastI], is_y);
			}
			
			var v1 = this.getVertexAttributeByIndices(this.pliCache[i-1], this.viCache[i-1], is_y);
			var v2 = this.getVertexAttributeByIndices(this.pliCache[i  ], this.viCache[i  ], is_y);
			
			var t = (ratio - rc[i-1]) / (rc[i] - rc[i-1]);
			var _t = 1.0 - t;
			
			return v1 * _t  +  v2 * t;
		},
		
		getVertexAttributeByIndices: function(pli, vi, is_y) {
			if (!is_y) {
				return this.owner.getLongitudeOnPolyline(pli, vi);
			} else {
				return this.owner.getLatitudeOnPolyline(pli, vi);
			}
		},
		
		countMidPointBetween: function(startRatio, endRatio) {
			// Count how many vertices...
			// Ratio Cacche   |    |   | |     |
			// Record           ^           ^       <== Mid=3
			console.log(startRatio, endRatio)
			var ls = this.ratioCache;
			var n = ls.length;
			var nFound = 0;
			
			for (var i = 0;i < n;++i) {
				var r = ls[i];
				if (r > startRatio) {
					if (r > endRatio) {break;}
					++nFound;
				}
			}
		},
		
		buildMidPointList: function(recordList, outRatioArray, outRecordIndexArray) {
			// Only counting when outRatioArray and outRecordIndexArray are null.
			var ratioCache = this.ratioCache;
			var nAdded = 0;
			
			var lastWrittenIndex = -1;
			var rlen = recordList.length;
			var nw_len = ratioCache.length;
			
			if (rlen < 2) {
				return 0;
			}
			
			var rofs = 0;
			var recordR = -999;
			for (var i = 0;i < nw_len;++i) {
				var rat1  = recordList[ lastWrittenIndex+1 ]._ratio;
				var v_rat = ratioCache[i];
				
				if (v_rat >= rat1) {
					for(;;) {
						++lastWrittenIndex;
						recordR = recordList[lastWrittenIndex]._ratio;
						if (outRatioArray) {       outRatioArray[nAdded] = recordR; }
						if (outRecordIndexArray) { outRecordIndexArray[nAdded] = lastWrittenIndex; } // ofs=0

						++nAdded;
//console.log("*R", recordR, lastWrittenIndex)

						if (lastWrittenIndex >= (rlen-1)) { break; }
						
						var nextR = recordList[ lastWrittenIndex+1 ]._ratio;
						if (nextR > v_rat) { break; }
					}
				}

				if (lastWrittenIndex >= (rlen-1)) { break; }
				if (!isNumbersNear(v_rat, recordR)) {
					var rdiff = recordList[lastWrittenIndex+1]._ratio - recordList[lastWrittenIndex]._ratio;
					rofs = (v_rat - recordList[lastWrittenIndex]._ratio) / rdiff;
					
					if (outRatioArray      ) { outRatioArray[nAdded] = v_rat; }
					if (outRecordIndexArray) { outRecordIndexArray[nAdded] = lastWrittenIndex + rofs }
++nAdded;


//console.log(".V", v_rat, lastWrittenIndex, rofs)
				}
			}
			
//console.log("----------------", nAdded, outRatioArray, "\n - -\n", outRecordIndexArray)
			return nAdded;
		}
	};



	function makeIntpRecordWithNetwork(outRec, tls, li1, li2, targetTime, extraProps) {
		var r1 = tls[li1];
		var r2 = tls[li2];
		
		var r1_t = r1._time;
		var r2_t = r2._time;
		
		var dt = r2_t - r1_t;

		// Calc ratio for interpolation
		var ratio = (targetTime - r1_t) / dt;
		var _r = 1.0 - ratio;

		outRec._time = targetTime;
		outRec._backKeyTime = r1_t;
		outRec._fwdKeyTime  = r2_t;
		outRec._id = r1._id; // Copy ID
		
		var n_ratio = _r * r1._ratio  +  ratio * r2._ratio;
		outRec.x = r1._network_object.pickLocation(n_ratio, false); 
		outRec.y = r1._network_object.pickLocation(n_ratio, true);

		for (var propName in extraProps) {
			if ((extraProps[propName] & PROP_INTERPOLATE) !== 0) {
				outRec[propName] = _r * r1[propName] + ratio * r2[propName];
			} else {
				outRec[propName] = (ratio < 0.5) ? r1[propName] : r2[propName];
			}
		}
	}

	function closeNetworkedRecordsTimeList() {
		mobmap.MovingData.TimeList.prototype.close.call(this);
		buildMidPointList(this);
	}
	
	function buildMidPointList(tl) {
		var rls = tl.getRecordList();
		if (rls.length < 1) { return; }

		var firstRecord = rls[0];
		var lengthToAllocate = firstRecord._network_object.buildMidPointList(rls, null, null);
		
		var r_arr = new Float32Array(lengthToAllocate);
		var i_arr = new Float32Array(lengthToAllocate);
		firstRecord._network_object.buildMidPointList(rls, r_arr, i_arr);
		
		tl.networkMidPointList = r_arr;
		tl.networkMidFloatIndexList = i_arr;
	}

	pkg.IndexedMovingData = IndexedMovingData;
})(window.mobmap);