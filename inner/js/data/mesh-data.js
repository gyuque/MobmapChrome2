if (!window.mobmap) window.mobmap={};

(function(pkg) {
	'use strict';
	
	function MeshData() {
		this.meshMap = {};
	}
	
	MeshData.prototype = {
		register: function(tSeconds, latIndex, lngIndex, value) {
			var cell = this.ensureCell(lngIndex, latIndex);
		},
		
		ensureCell: function(x, y) {
			var k = makeMeshKey(x, y);
			var m = this.meshMap;
			if (!m.hasOwnProperty(k)) {
				m[k] = new MeshCell();
			}

			return m[k];
		}
	};


	function MeshCell() {
		
	}
	
	
	function makeMeshKey(x, y) {
		return y + "_" + x;
	}
	
	pkg.MeshData = MeshData;
})(window.mobmap);