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
			//
		},
		
		close: function() {
			this.buildList();
		},

		createPickPool: function() {
			var count = this.countIds();
			var pl = new PickPool(count);
			return pl;
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
			
			/*
			var m = this.idMap;
			for (var objId in m) {
			}*/
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
		}
	};


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
		pickAt: function(pickPool, pickedRec, seconds, extraProps, pickIndex) {
			var ls = this.recordList;
			var len = ls.length;
		}
	};

	pkg.MovingData2 = MovingData2;
})(mobmap);