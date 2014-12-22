if (!window.mobmap) window.mobmap={};

(function(pkg) {
	'use strict';
	
	function MeshData() {
		this.meshMap = {};
		this.dynamic = false;
		this.dynStatProvider = null;
		
		// + for pick optimization +
		//   Use this hash to skip empty row.
		this.usedRowMap = {};
		
		this.indexRange = {
			minX: 0,
			maxX: 0,
			minY: 0,
			maxY: 0
		};
		
		this.meshDefinition = null;
		
		this.timeRange = {
			min:0, max:0
		};
	}
	
	MeshData.prototype = {
		register: function(tSeconds, latIndex, lngIndex, value) {
			var cell = this.ensureCell(lngIndex, latIndex);
			cell.addRecord(tSeconds, value);
			return cell;
		},
		
		isTimeRangeLengthValid: function() {
			var d = this.timeRange.max - this.timeRange.min;
			return d > 0.1;
		},
		
		pick: function(latIndex, lngIndex, tSeconds) {
			var k = makeMeshKey(lngIndex, latIndex);
			var m = this.meshMap;
			
			if (m.hasOwnProperty(k)) {
				var cell = m[k];
				return cell.pickAtTime(tSeconds);
			} else {
				return null;
			}
		},
		
		forEachCell: function(proc) {
			var m = this.meshMap;
			
			for (var k in m) {
				proc(k, m[k]);
			}
		},
		
		calcAverageOfAllCells: function(useDynStat) {
			var s = 0;
			var n = 0;
			function calc_sum(key, cell) {
				var val = useDynStat ? cell.lastStatValue : cell.lastPickedValue;
				if (isFinite(val)) {
					s += val;
					++n;
				}
			}
			
			this.forEachCell(calc_sum);
			
//console.log("##", s, n);
			return (n===0) ? 0 : (s / n);
		},
		
		calcCorrelation: function(meshAvg, dynsAvg, detailOut) {
			var sum_m2 = 0;
			var sum_d2 = 0;
			var sum_md = 0;
			
			var n = 0;
			
			function cell_proc(key, cell) {
				var mval = cell.lastPickedValue;
				var dval = cell.lastStatValue;
				if (isFinite(mval) && isFinite(dval)) {
					var d_m = mval - meshAvg;
					var d_d = dval - dynsAvg;
					
					sum_m2 += d_m * d_m;
					sum_d2 += d_d * d_d;

					sum_md += d_m * d_d;
					
					++n;
				}
			}
			
			this.forEachCell(cell_proc);
			var R = sum_md / Math.sqrt(sum_m2 * sum_d2);
			
			if (detailOut) {
				detailOut.n = n;
				detailOut.t = (R * Math.sqrt(n - 2)) / Math.sqrt(1 - R*R);
			}
			
			return R;
		},

		// DynStat
		isDynStatEnabled: function() {
			if (this.dynStatProvider) {
				return !!(this.dynStatProvider.targetMovingData);
			}
			
			return false;
		},

		updateMeshValueCache: function(tSeconds) {
			this.forEachCell(function(key, cell) {
				var rec = cell.pickAtTime(tSeconds);
				cell.lastPickedValue = rec.val;
			});
		},

		updateDynStat: function(tSeconds) {
			this.resetStatValue();
			if (this.dynStatProvider) {
				this.dynStatProvider.calc(tSeconds, this.meshDefinition, this);
				if (this.dynStatProvider.functionType === kStatFunctionAverage) {
					this.calcStatAverage();
				}
			}
		},
		
		resetStatValue: function() {
			var m = this.meshMap;
			for (var i in m) {
				m[i].lastStatValue = 0;
				m[i].lastStatCount = 0;
			}
		},
		
		calcStatAverage: function() {
			var m = this.meshMap;
			for (var i in m) {
				m[i].lastStatValue /= m[i].lastStatCount;
			}
		},

		ensureCell: function(x, y) {
			var k = makeMeshKey(x, y);
			var m = this.meshMap;
			if (!m.hasOwnProperty(k)) {
				m[k] = new MeshCell(x, y);
			}

			return m[k];
		},
		
		getCell: function(x, y) {
			return this.meshMap[ makeMeshKey(x, y) ] || null;
		},
		
		close: function() {
			var m = this.meshMap;
			for (var i in m) {
				m[i].sortByTime();
			}

			this.buildRowMap();
			this.checkRange();
		},
		
		checkRange: function() {
			var bignum = 2147483648;
			
			var tr = this.timeRange;
			tr.min = bignum;
			tr.max = -bignum;
			
			var minX =  bignum;
			var maxX = -bignum;
			var minY =  bignum;
			var maxY = -bignum;
			
			var m = this.meshMap;
			for (var i in m) {
				var c = m[i];
				minX = Math.min(minX, c.cellIndexX);
				maxX = Math.max(maxX, c.cellIndexX);
				
				minY = Math.min(minY, c.cellIndexY);
				maxY = Math.max(maxY, c.cellIndexY);
				
				tr.min = Math.min(c.getFirstTime(), tr.min);
				tr.max = Math.max(c.getLastTime(), tr.max);
			}
			
			this.indexRange.minX = minX;
			this.indexRange.maxX = maxX;
			
			this.indexRange.minY = minY;
			this.indexRange.maxY = maxY;
		},
		
		buildRowMap: function() {
			this.clearRowMap();
			var rm = this.usedRowMap;
			
			var m = this.meshMap;
			for (var i in m) {
				var c = m[i];
				var y = c.cellIndexY;
				
				if (!rm.hasOwnProperty(y)) { rm[y] = 0; }
				++rm[y];
			}
		},
		
		clearRowMap: function() {
			var m = this.usedRowMap;
			for (var i in m) { delete m[i]; }
		},
		
		hasRowAnyData: function(yIndex) {
			return !! this.usedRowMap[yIndex];
		},
		
		ensureDynStat: function() {
			if (!this.dynStatProvider) {
				this.dynStatProvider = new MeshDynStatProvider();
			}
			
			return this.dynStatProvider;
		},
		
		setDynStatTargetMovingData: function(movingData) {
			var ds = this.ensureDynStat();
			ds.setTargetMovingData(movingData);
		},
		
		setDynStatTargetAttributeName: function(attrName) {
			var ds = this.ensureDynStat();
			ds.setTargetAttributeName(attrName);
		},
		
		setDynStatFunctionType: function(t) {
			var ds = this.ensureDynStat();
			ds.setFunctionType(t);
		},
		
		hasValidDynStatTarget: function() {
			if (!this.dynStatProvider) {
				return false;
			}

			return this.dynStatProvider.hasValidTarget();
		}
	};


	function MeshCell(cx, cy) {
		this.cellIndexX = cx;
		this.cellIndexY = cy;
		this.timedList = [];
		this.lastPickedValue = 0;
		this.lastStatValue = 0;
		this.lastStatCount = 0;
		this.name = null;
	}
	
	MeshCell.prototype = {
		addRecord: function(tSeconds, value) {
			var rec = new MeshRecord(tSeconds, value);
			this.timedList.push(rec);
		},
		
		sortByTime: function() {
			this.timedList.sort( meshrecSortFunc );
		},
		
		pickAtTime: function(tSeconds) {
			var ls  = this.timedList;
			var len = ls.length;
			if (len < 1) { return 0; }
			
			var nextT = 0;
			
			for (var i = 0;i < len;++i) {
				var rec = ls[i];
				if (rec.t > tSeconds) {
					nextT = i;
					break;
				}
			}
			
			// [t] is after end
			if (i === len) {
				ls[len-1].statVal = this.lastStatValue;
				return ls[len-1];
			}
			
			// [t] is before start 
			if (nextT === 0) {
				ls[0].statVal = this.lastStatValue;
				return ls[0];
			}
			
			ls[nextT - 1].statVal = this.lastStatValue;
			return ls[nextT - 1];
		},
		
		getFirstTime: function() {
			if (this.timedList.length > 0) {
				return this.timedList[0].t;
			}
			
			return 0;
		},
		
		getLastTime: function() {
			var len = this.timedList.length;
			if (len > 0) {
				return this.timedList[len-1].t;
			}
			
			return 0;
		}
	};
	
	
	function MeshRecord(t, v) {
		this.t = t;
		this.val = v;
		this.statVal = 0;
	}
	
	
	// Statistical feature
	function MeshDynStatProvider() {
		this.targetMovingData = null;
		this.targetAttributeName = null;
		this.functionType = kStatFunctionSum;
		this.pickPool = null;
	}
	
	MeshDynStatProvider.prototype = {
		hasValidTarget: function() {
			return !!(this.targetMovingData);
		},
		
		setTargetMovingData: function(d) {
			this.targetMovingData = d;
		},
		
		setTargetAttributeName: function(attrName) {
			this.targetAttributeName = attrName;
		},
		
		setFunctionType: function(t) {
			this.functionType = t;
		},
		
		calc: function(timeInSeconds, meshDefinition, meshData) {
			// Prepare
			var mdat = this.targetMovingData;
			if (!mdat) {
				return;
			}
			
			if (!this.pickPool) {
				this.pickPool = mdat.createPickPool();
			}
			
			// Pick
			this.pickPool.clear();
			mdat.pickAt(this.pickPool, timeInSeconds);
			this.totalPickedRecords(this.pickPool, meshDefinition, meshData);
		},
		
		totalPickedRecords: function(ppool, meshDefinition, meshData) {
			var count = ppool.pickedCount;
			var src_array = ppool.getArray();
			
			var ox = meshDefinition.originLng;
			var xstep = meshDefinition.stepLng;

			var oy = meshDefinition.originLat;
			var ystep = meshDefinition.stepLat;
			var attr = this.targetAttributeName;

			for (var i = 0;i < count;++i) {
				var rec = src_array[i];
				var cx = Math.floor((rec.x - ox) / xstep);
				var cy = Math.floor((rec.y - oy) / ystep);

				var cell = meshData.getCell(cx, cy);
				if (cell) {
					++cell.lastStatCount;
					
					if (attr) {
						cell.lastStatValue += rec[attr];
					} else {
						++cell.lastStatValue;
					}
				}
			}
		}
	};
	
	
	// Utility functions
	function makeMeshKey(x, y) {
		return y + "_" + x;
	}
	
	function meshrecSortFunc(a,b) {
		return a.t - b.t;
	}
	
	pkg.MeshData = MeshData;
})(window.mobmap);