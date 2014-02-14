if (!window.mobmap) window.mobmap={};

(function(pkg) {
	'use strict';
	
	function MeshData() {
		this.meshMap = {};
		this.indexRange = {
			minX: 0,
			maxX: 0,
			minY: 0,
			maxY: 0
		};
		
		this.timeRange = {
			min:0, max:0
		};
	}
	
	MeshData.prototype = {
		register: function(tSeconds, latIndex, lngIndex, value) {
			var cell = this.ensureCell(lngIndex, latIndex);
			cell.addRecord(tSeconds, value);
		},
		
		pick: function(latIndex, lngIndex, tSeconds) {
			var k = makeMeshKey(lngIndex, latIndex);
			var m = this.meshMap;
			
			if (m.hasOwnProperty(k)) {
				var cell = m[k];
				return cell.pickAtTime(tSeconds);
			} else {
				return 0;
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
		
		close: function() {
			var m = this.meshMap;
			for (var i in m) {
				m[i].sortByTime();
			}

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
		}
	};


	function MeshCell(cx, cy) {
		this.cellIndexX = cx;
		this.cellIndexY = cy;
		this.timedList = [];
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
				return ls[len-1];
			}
			
			// [t] is before start 
			if (nextT === 0) {
				return ls[0];
			}
			
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
	}
	
	
	// Utility functions
	function makeMeshKey(x, y) {
		return y + "_" + x;
	}
	
	function meshrecSortFunc(a,b) {
		return a.t - b.t;
	}
	
	pkg.MeshData = MeshData;
})(window.mobmap);