if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function ExploreMapType(ownerMap) {
		this.ownerMap = ownerMap;
		this.ownerObject = null;
		this.tileSize = new google.maps.Size(256, 256);
		this.dataSoure = null;
	}
	
	ExploreMapType.installMapType = function(targetGMap) {
		var mt = new ExploreMapType(targetGMap);
		targetGMap.overlayMapTypes.insertAt(0, mt);
		return mt;
	};
	
	ExploreMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
		var tileElement = ownerDocument.createElement('canvas');
		setCanvasSize(tileElement, this.tileSize.width, this.tileSize.height);
		
		tileElement.style.boxShadow = "0 0 3px rgba(10,90,0,0.5) inset";
		tileElement._cx = coord.x;
		tileElement._cy = coord.y;
		tileElement._lastRenderedIndex = -1;
		// tileElement._tileKey = tileKey;

		return tileElement;
	};
	
	ExploreMapType.prototype.setDataSource = function(ds) {
		if (this.dataSoure === ds) {
			return;
		}
		
		// Check implementation
		if (ds) {
			checkPolylineDatasourceImplementation(ds);
		}
		
		this.dataSoure = ds;
	};
	
	// -- Utilities
	
	function setCanvasSize(el, w, h) {
		var s = el.style;
		s.width = Math.floor(w) + 'px';
		s.height = Math.floor(h) + 'px';
		
		el.width = Math.floor(w);
		el.height = Math.floor(h);
	}
	
	
	var PolylineDatasourceMethods = [
		'tpCountPolylines'
	];
	
	function checkPolylineDatasourceImplementation(obj) {
		for (var i in PolylineDatasourceMethods) {
			var name = PolylineDatasourceMethods[i];
			if (! obj[name] ) {
				throw "Datasource object must implement " + name;
			}
		}
	}

	aGlobal.mobmap.ExploreMapType = ExploreMapType;
})(window);