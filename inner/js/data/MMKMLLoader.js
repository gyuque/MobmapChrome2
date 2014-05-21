if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function KMLLoader(xmlDocument) {
		this.polygonList = [];
		this.xmlDocument = xmlDocument;
		this.jXMLDocument = $(xmlDocument);
		
		this.parse();
	}
	
	KMLLoader.isDocumentValid = function(xmlDocument) {
		return $(xmlDocument).find("Placemark").length > 0;
	};
	
	KMLLoader.parseCoordinateList = function(source) {
		source = source.replace(/^[ \t\r\n]+/m, '');
		source = source.replace(/[ \t\r\n]+$/m, '');
		var outArray = [];

		var list = source.split( /[ \t\r\n]+/ );
		var len = list.length;
		for (var i = 0;i < len;++i) {
			var pt = KMLLoader.parseGeoCoordinate(list[i]);
			outArray.push(pt);
		}
		
		return outArray;
	};

	KMLLoader.parseGeoCoordinate = function(source) {
		var pt = {x:0,y:0,alt:0};
		var ls = source.split(',');
		pt.x = parseFloat(ls[0]);
		pt.y = parseFloat(ls[1]);
		pt.alt = ls[2] ? parseFloat(ls[2]) : 0;
		
		return pt;
	};
	
	KMLLoader.removeDuplicatedEndPoint = function(list) {
		if (list.length < 2) {
			return;
		}
		
		var p1 = list[0];
		var p2 = list[list.length - 1];
		
		var dx = p1.x - p2.x;
		var dy = p1.y - p2.y;
		var d = dx*dx + dy*dy;
		
		if (d < 0.00000001) {
			list.pop();
			return true;
		}
		
		return false;
	};
	
	KMLLoader.prototype = {
		parse: function() {
			this.jXMLDocument.find("Placemark").each(this.readPlacemark.bind(this));
		},
		
		readPlacemark: function(i, element) {
			var j = $(element);
			var jPolygons = j.find('Polygon');
			if (jPolygons.length > 0) {
				var pg = this.readPolygon(jPolygons);
				this.polygonList.push(pg);
			}
		},
		
		readPolygon: function(jPolygons) {
			var pg = null;
			var outerBoundaries = jPolygons.find("outerBoundaryIs");
			if (outerBoundaries.length > 0) {
				var outerCoords = this.readPolygonBoundary(outerBoundaries[0]);
				pg = new KMLPolygon();
				pg.outerCoordinates = outerCoords;
			}
			
			return pg;
		},
		
		readPolygonBoundary: function(boundaryElement) {
			var coords = $(boundaryElement).find('coordinates');
			var parsedList = KMLLoader.parseCoordinateList(coords.text());
			KMLLoader.removeDuplicatedEndPoint(parsedList);

			return parsedList;
		},
		
		getNumOfPolygons: function() {
			return this.polygonList.length;
		},
		
		getPolygonAt: function(i) {
			return this.polygonList[i] || null;
		}
	};
	
	function KMLPolygon() {
		this.outerCoordinates = null;
	}
	
	KMLPolygon.prototype = {
		generateGoogleMapsPaths: function() {
			var paths = [];
			paths.push(
				this.generatePathOfLoop(this.outerCoordinates)
			);
			
			return paths;
		},
		
		generatePathOfLoop: function(coords) {
			var outArray = [];
			var len = coords.length;
			for (var i = 0;i < len;++i) {
				var pt = coords[i];
				outArray.push( new google.maps.LatLng(pt.y, pt.x) );
			}
			
			return outArray;
		}
	};

	aGlobal.mobmap.KMLLoader = KMLLoader;
})(window);