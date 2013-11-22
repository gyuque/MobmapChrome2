if (!window.mobmap) window.mobmap={};

(function(pkg) {
	var PROP_INTERPOLATE = 0x1;

	function MovingData() {
		this.idMap = createCleanHash();
		this.extraProps = createCleanHash();
	}
	
	MovingData.createEmptyRecord = createCleanHash;
	
	MovingData.prototype = {
		// Register API ---------------------------------
		register: function(objId, t, record) {
			record._time = t;
			record._id   = objId;
		
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
		
		clearExtraProperties: function() {
			for (var i in this.extraProps) {
				delete this.extraProps[i];
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

		// Pick API -------------------------------------
		pickAt: function(pickPool, seconds, pickIndex) {
			if (!pickIndex) {pickIndex=0;}
			
			var m = this.idMap;
			for (var objId in m) {
				var tl = m[objId];
				tl.pickAt(pickPool, null, seconds, this.extraProps, pickIndex);
			}
		},
		
		pickById: function(outRecord, seconds, objId) {
			var tl = this.idMap[objId];
			tl.pickAt(null, outRecord, seconds, this.extraProps);
		},
		
		isKeyframe: function(objId, seconds) {
			var tl = this.idMap[objId];
			if (!tl) { return false; }
			
			return !! tl.getKeyFrameRecord(seconds);
		},

		getKeyFrameRecord: function(objId, seconds) {
			var tl = this.idMap[objId];
			if (!tl) { return null; }
			
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
			var m = this.idMap;
			for (var objId in m) {
				m[objId].close();
			}
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
					pickedRec = pickPool.getPooledRecord();
					pickedRec._pickIndex = pickIndex;
					pickedRec._pickTime  = seconds;
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
	
	function tlSortFunc(a, b) {
		return a._time - b._time;
	}

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


	pkg.MovingData = MovingData;
})(mobmap);
