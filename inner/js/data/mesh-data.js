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
	}
	
	MeshData.prototype = {
		register: function(tSeconds, latIndex, lngIndex, value) {
			var cell = this.ensureCell(lngIndex, latIndex);
			cell.addRecord(tSeconds, value);
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
			this.checkRange();
			
			var m = this.meshMap;
			for (var i in m) {
				m[i].sortByTime();
			}
		},
		
		checkRange: function() {
			var minX =  9999999;
			var maxX = -9999999;
			var minY =  9999999;
			var maxY = -9999999;
			
			var m = this.meshMap;
			for (var i in m) {
				var c = m[i];
				minX = Math.min(minX, c.cellIndexX);
				maxX = Math.max(maxX, c.cellIndexX);
				
				minY = Math.min(minY, c.cellIndexY);
				maxY = Math.max(maxY, c.cellIndexY);
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