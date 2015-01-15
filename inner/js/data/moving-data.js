if (!window.mobmap) window.mobmap={};

(function(pkg) {
	'use strict';
	var PROP_INTERPOLATE = 0x1;

	function MovingData() {
		this.pickOffset = 0;
		this.idMap = createCleanHash();
		this.tlList = null;

		this.extraProps = createCleanHash();
	}
	
	MovingData.createEmptyRecord = createCleanHash;
	MovingData.isInvalidProp = function(obj, prop) {
		return !obj[prop] && obj[prop] !== 0;
	};
	
	MovingData.prototype = {
		// Register API ---------------------------------
		register: function(record) {
			if (MovingData.isInvalidProp(record, '_time') ||
			    MovingData.isInvalidProp(record, '_id')) {
				throw "Record must have _time and _id";
			}
		
			record._time = record._time | 0;
		
			var objId = record._id;
			var timeList = this.ensureId(objId);
			timeList.addRecord(record);
		},
		
		addExtraProperty: function(name, enableInterpolate) {
			var flags = 0;
			if (enableInterpolate) {
				flags |= PROP_INTERPOLATE;
			}
		
			this.extraProps[name] = flags;
		},
		
		addAttributeAfterLoad: function(name, enableInterpolate, initType, initialValue) {
			if ( !MovingData.isInvalidProp(this.extraProps, name) ) { return false; }
			
			this.addExtraProperty(name, enableInterpolate);
			var len = this.tlList.length;
			for (var i = 0;i < len;++i) {
				this.tlList[i].fillValue(name, initialValue);
			}
			
			return true;
		},
		
		clearExtraProperties: function() {
			for (var i in this.extraProps) {
				delete this.extraProps[i];
			}
		},
		
		forEachExtraProperty: function(proc) {
			for (var i in this.extraProps) {
				proc(i, this.extraProps[i]);
			}
		},

		cropEarlierDays: function(minDayIndex, maxLimit) {
			var m = this.idMap;
			var newMin = maxLimit - minDayIndex;
			for (var objId in m) {
				var tl = m[objId];
				var mint = tl.cropEarlierDays(minDayIndex);
				if (mint < newMin) {
					newMin = mint;
				}
			}
			
			return newMin;
		},
		
		cropLaterDays: function(maxDayIndex, minLimit) {
			var m = this.idMap;
			var newMax = minLimit;
			for (var objId in m) {
				var tl = m[objId];
				var maxt = tl.cropLaterDays(maxDayIndex);
				if (maxt > newMax) {
					newMax = maxt;
				}
			}
			
			return newMax;
		},
		
		// Configure
		setRemainSidesMode: function(enabled) {
			var ls = this.tlList;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var t_l = ls[i];
				t_l.remainSides = enabled;
			}
		},

		// Pick API -------------------------------------
		pickAt: function(pickPool, timeInSec, pickIndex, tailLength, tailInterval) {
			if (!pickIndex) {pickIndex=0;}
			timeInSec += this.pickOffset;
			
			var i;
			var ls = this.tlList;
			var len = ls.length;
			for (i = 0;i < len;++i) {
				var t_l = ls[i];
				var pickedRecord = t_l.pickAt(pickPool, null, timeInSec, this.extraProps, pickIndex);
				if (pickedRecord && tailLength) {
					var tail_arr = ensureTailRecordList(pickedRecord, tailLength);
					for (var j = 0;j < tailLength;++j) {
						var back = tailLength - j;
						t_l.pickAt(null, tail_arr[back - 1], timeInSec - back * tailInterval, this.extraProps, pickIndex);
					}
				}
			}
		},
		
		pickById: function(outRecord, seconds, objId) {
			seconds += this.pickOffset;
			
			var tl = this.idMap[objId];
			tl.pickAt(null, outRecord, seconds, this.extraProps);
		},
		
		getFlattenTLArray: function() {
			return this.tlList;
		},
		
		getTimeListOfId: function(objId) {
			return this.idMap[objId] || null;
		},
		
		isKeyframe: function(objId, seconds) {
			var tl = this.idMap[objId];
			if (!tl) { return false; }
			
			seconds += this.pickOffset;
			return !! tl.getKeyFrameRecord(seconds);
		},

		getKeyFrameRecord: function(objId, seconds) {
			var tl = this.idMap[objId];
			if (!tl) { return null; }
			
			seconds += this.pickOffset;
			return tl.getKeyFrameRecord(seconds);
		},

		hasExtraProperties: function() {
			for (var i in this.extraProps) {
				return true;
			}
			
			return false;
		},
		
		// Write API
		
		writePropertyOnAllTime: function(id, prop, newValue) {
			var tl = this.idMap[id];
			if (!tl) {
				return false;
			}
			
			if (!this.extraProps[prop] && this.extraProps[prop] !== 0) {
				return false;
			}
			
			return tl.writePropertyOnAllTime(prop, newValue, this.extraProps);
		},
		
		// Internal funcs -------------------------------
		ensureId: function(objId) {
			if (!this.idMap[objId]) {
				this.idMap[objId] = new TimeList(objId);
			}
			
			return this.idMap[objId];
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
		
		cancelLastFetch: function() {
			if (this.pickedCount > 0) {
				--this.pickedCount;
			}
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
	
	function ensureTailRecordList(ownerRecord, count) {
		var i;
		
		if (!ownerRecord._tailRecords) {
			// Add property as 'Non-enumerable'
			Object.defineProperty(ownerRecord, "_tailRecords", {value: 0,
			                               writable : true,
			                               enumerable : false,
			                               configurable : true});

			ownerRecord._tailRecords = new Array(count);
			for (i = 0;i < count;++i) {
				ownerRecord._tailRecords[i] = createCleanHash();
			}
		} else {
			var arr = ownerRecord._tailRecords;
			var oldLen = arr.length;
			if (oldLen >= count) {
				return ownerRecord._tailRecords;
			} else {
				arr.length = count;
				for (i = oldLen;i < count;++i) {
					arr[i] = createCleanHash();
				}
			}
		}
		
		return ownerRecord._tailRecords;
	}

	function TimeList(objId) {
		this.id = objId;
		this.stringId = objId.toString();
		this.recordList = [];
		this.remainSides = true;

		this.cahcedIndex = -1;
		this.cahcedTime  = -1;
	}
	
	TimeList.prototype = {
		getRecordList: function() {
			return this.recordList;
		},
		
		isEmpty: function() {
			return this.recordList.length < 1;
		},
		
		fillValue: function(attrName, newValue) {
			var ls = this.recordList;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				ls[i][attrName] = newValue;
			}
		},

		hasMoreTwoEnds: function() {
			return this.recordList.length > 1;
		},

		pickAt: function(pickPool, pickedRec, seconds, extraProps, pickIndex) {
			var ls = this.recordList;
			var len = ls.length;
			var startIndex = 0;
			var fetchedPool = false;

			// Forward pick optimization
			if (this.cahcedIndex >= 0 && this.cahcedTime < seconds) {
				startIndex = this.cahcedIndex;
			}

			var i, previ = -1;
			for (i = startIndex;i < len;++i) {
				var rec = ls[i];
				if (rec._time > seconds) {
					break;
				}
			}
			
			if (len > 0) {
				if (i > 0) {
					previ = i - 1;

					// Update fwd-pick cache
					this.cahcedIndex = previ;
					this.cahcedTime  = ls[previ]._time;
				}

				// Set output record object if null
				fetchedPool = false;
				if (!pickedRec) {
					pickedRec = pickPool.getPooledRecord();
					pickedRec._pickIndex = pickIndex;
					pickedRec._pickTime  = seconds;
					fetchedPool = true;
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
						if (this.remainSides) {
							// Use right-end of timed list
							this.pickEndRecord(pickedRec, ls, len - 1, extraProps);
						} else {
							if (fetchedPool) {
								pickPool.cancelLastFetch();
								pickedRec = null;
							}
						}
					}
				} else {
					if (this.remainSides) {
						// Use left-end of timed list
						this.pickEndRecord(pickedRec, ls, 0, extraProps);
					} else {
						if (fetchedPool) {
							pickPool.cancelLastFetch();
							pickedRec = null;
						}
					}
				}
			}
			
			return pickedRec;
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

			for (var i = 0;i < len;++i) {
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
	
	function tlSortFunc(a, b) {
		return a._time - b._time;
	}

	function makeIntpRecord(outRec, tls, li1, li2, targetTime, extraProps) {
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


	pkg.MovingData = MovingData;
})(mobmap);
