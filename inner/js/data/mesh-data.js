if (!window.mobmap) window.mobmap={};

(function(pkg) {
	'use strict';
	
	function MeshData() {
		this.meshMap = {};
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
				m[k] = new MeshCell();
			}

			return m[k];
		},
		
		close: function() {
			var m = this.meshMap;
			for (var i in m) {
				m[i].sortByTime();
			}
		}
	};


	function MeshCell() {
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