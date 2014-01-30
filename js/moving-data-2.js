if (!window.mobmap) window.mobmap={};

(function(pkg) {
	'use strict';
	
	function MovingData2() {
		this.idMap = createCleanHash();
		this.extraProps = createCleanHash();
		this.tlList = null;
	}
	
	// Static utility functions - - - - - - - - - - - -
	MovingData2.createEmptyRecord = createCleanHash;
	MovingData2.isInvalidProp = function(obj, prop) {
		return !obj[prop] && obj[prop] !== 0;
	};

	// Methods - - - - - - - - - - - - -
	MovingData2.prototype = {
		// Public APIs ======================================

		// Register a record
		// 'record' object must have '_time' and '_id'
		register: function(record) {
			// Check required properties
			if (MovingData2.isInvalidProp(record, '_time') ||
			    MovingData2.isInvalidProp(record, '_id')) {
				throw "Record must have _time and _id";
			}
		
			// * -> Integer
			record._time = record._time | 0;
		
			var objId = record._id;
			var timeList = this.ensureId(objId);
			timeList.addRecord(record);
		},
		
		close: function() {
			this.buildList();
			this.closeInList(this.tlList);
		},

		createPickPool: function() {
			var count = this.countIds();
			var pl = new PickPool(count);
			return pl;
		},
		
		// Extra properties API
		clearExtraProperties: function() {
			for (var i in this.extraProps) {
				delete this.extraProps[i];
			}
		},

		// Pick API -------------------------------------
		pickAt: function(pickPool, timeInSec, pickIndex) {
			if (!pickIndex) {pickIndex=0;}
			
			var i;
			var ls = this.tlList;
			var len = ls.length;
			for (i = 0;i < len;++i) {
				var t_l = ls[i];
				t_l.pickAt(pickPool, null, timeInSec, this.extraProps, pickIndex);
			}
		},
		
		// Internal funcs -------------------------------
		ensureId: function(objId) {
			if (!this.idMap[objId]) {
				this.idMap[objId] = new TimeList(objId);
			}
			
			return this.idMap[objId];
		},
		
		countIds: function() {
			var i = 0;
			var m = this.idMap;
			for (var objId in m) { ++i; }
			
			return i;
		},
		
		// Build array from hash for quick access
		buildList: function() {
			this.tlList = [];
			var ls = this.tlList;
			
			var m = this.idMap;
			for (var objId in m) {
				ls.push(m[objId]);
			}
		},
		
		closeInList: function(ls) {
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				ls[i].close();
			}
		}
	};

	
	function tlSortFunc(a, b) {
		return a._time - b._time;
	}


	// [][][][][][]  PickPool  [][][][][][]
	function PickPool(maxLength) {
		this.pool = null;
		this.maxLength = maxLength;
		this.originalMax = maxLength;
		this.pickedCount = 0;
		this.allocate(maxLength);
	}
	
	PickPool.prototype = {
		clear: function() {
			this.pickedCount = 0;
		},
		
		getPooledRecord: function() {
			if (this.pickedCount >= this.maxLength) {
				return null;
			}
			
			return this.pool[this.pickedCount++];
		},

		allocate: function(len) {
			this.pool = [];
			for (var i = 0;i < len;++i) {
				this.pool.push( createCleanHash() );
			}
		},
		
		extend: function(newMax) {
			var oldLen = this.pool.length;
			if (newMax > oldLen) {
				this.maxLength = newMax;
				for (var i = oldLen;i < newMax;++i) {
					this.pool.push( createCleanHash() );
				}
			}
		},
		
		getArray: function() {
			return this.pool;
		}
	};



	function TimeList(objId) {
		this.id = objId;
		this.recordList = [];
	}
	
	TimeList.prototype = {
		getRecordList: function() {
			return this.recordList;
		},
		
		isEmpty: function() {
			return this.recordList.length < 1;
		},

		pickAt: function(pickPool, pickedRec, seconds, extraProps, pickIndex) {
			var ls = this.recordList;
			var len = ls.length;
			
			var i, previ = -1;
			for (i = 0;i < len;++i) {
				var rec = ls[i];
				if (rec._time > seconds) {
					break;
				}
			}

			if (len > 0) {
				if (i > 0) {
					previ = i - 1;
				}

				// Set output record object if null
				if (!pickedRec) {
					//pickedRec = pickPool.pool[ pickPool.pickedCount++ ] || null;
					pickedRec = pickPool.getPooledRecord();
					pickedRec._pickIndex = pickIndex;
					pickedRec._pickTime  = seconds;
				}

				if (!pickedRec) {
					console.log("WARNING: Cannot get pick-record: "+pickedRec);
					return;
				}

				if (i > 0) {
					if (i < len) {
						// Interpolate between two items in timed list
						this.pickIntpRecord(pickedRec, ls, previ, i, seconds, extraProps);
					} else {
						// Use right-end of timed list
						this.pickEndRecord(pickedRec, ls, len - 1, extraProps);
					}
				} else {
					// Use left-end of timed list
					this.pickEndRecord(pickedRec, ls, 0, extraProps);
				}
			}
		},
		
		pickIntpRecord: function(outRec, tls, li1, li2, t, extraProps) {
			makeIntpRecord(outRec, tls, li1, li2, t, extraProps);
		},
		
		pickEndRecord: function(outRec, tls, li, extraProps) {
			var src = tls[li];
			outRec._time = src._time;
			outRec._backKeyTime = null;
			outRec._fwdKeyTime  = null;
			outRec._id = src._id; // Copy ID
			outRec.x = src.x;
			outRec.y = src.y;
			
			for (var propName in extraProps) {
				outRec[propName] = src[propName];
			}
		},
	
		addRecord: function(r) {
			this.recordList.push(r);
		},
		
		close: function() {
			this.recordList.sort(tlSortFunc);
		},
		
		getKeyFrameRecord: function(seconds) {
			var ls = this.recordList;
			var len = ls.length;

			for (i = 0;i < len;++i) {
				var rec = ls[i];
				if (rec._time === seconds) {
					return rec;
				}
			}
			
			return null;
		},

		getNextKeyTime: function(seconds) {
			var ls = this.recordList;
			var len = ls.length;

			for (i = 0;i < len;++i) {
				var rec = ls[i];
				if (rec._time === seconds) {
					if ( i < (len-1) ) {
						return ls[i+1]._time;
					}
				}
			}
			
			return null;
		},
		
		writePropertyOnAllTime: function(prop, newValue, extraProps) {
			var ls = this.recordList;
			var len = ls.length;

			for (i = 0;i < len;++i) {
				var rec = ls[i];
				rec[prop] = newValue;
			}
			
			return true;
		},
		
		cropEarlierDays: function(minDayIndex) {
			var ls = this.recordList;
			var mint = 0;
			for (;ls.length > 0;) {
				if (ls[0]._time < minDayIndex) {
					ls.shift();
				} else {
					break;
				}
			}
			
			// Shift rel time
			for (var i = 0;i < ls.length;++i) {
				ls[i]._time -= minDayIndex;
			}
			
			if (ls.length > 0) { mint = ls[0]._time; }
			return mint;
		},
		
		cropLaterDays: function(maxDayIndex) {
			var ls = this.recordList;
			var maxt = 0;

			for (;ls.length > 0;) {
				if (ls[ ls.length-1 ]._time > maxDayIndex) {
					ls.pop();
				} else {
					break;
				}
			}

			if (ls.length > 0) { maxt = ls[ ls.length-1 ]._time; }
			return maxt;
		}
	};



	function makeIntpRecord(outRec, tls, li1, li2, targetTime, extraProps) {
		var r1 = tls[li1];
		var r2 = tls[li2];
		
		var t1 = r1._time;
		var dt = r2._time - r1._time;

		// Calc ratio for interpolation
		var ratio = (targetTime - t1) / dt;
		var _r = 1.0 - ratio;

		outRec._time = targetTime;
		outRec._backKeyTime = t1;
		outRec._fwdKeyTime  = r2._time;
		outRec._id = r1._id; // Copy ID
		outRec.y = _r * r1.y + ratio * r2.y;
		outRec.x = _r * r1.x + ratio * r2.x;

		for (var propName in extraProps) {
			if ((extraProps[propName] & PROP_INTERPOLATE) !== 0) {
				outRec[propName] = _r * r1[propName] + ratio * r2[propName];
			} else {
				outRec[propName] = (ratio < 0.5) ? r1[propName] : r2[propName];
			}
		}
	}


	pkg.MovingData2 = MovingData2;
})(mobmap);