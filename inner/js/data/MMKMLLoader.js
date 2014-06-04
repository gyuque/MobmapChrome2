if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function KMLLoader(xmlDocument) {
		this.fileName = 'unknown';
		this.polygonList = [];
		this.xmlDocument = xmlDocument;
		this.jXMLDocument = $(xmlDocument);
		
		this.parse();
	}
	
	KMLLoader.createFromFileObject = function(file, callback) {
		
		var reader = new FileReader();
		reader.onloadend = function(e) {
			if (e.target.readyState == FileReader.DONE) {
				var body = e.target.result;

				var parser = new DOMParser();
				var xmlDoc = parser.parseFromString(body, "application/xml");
				var valid = mobmap.KMLLoader.isDocumentValid(xmlDoc);
				if (!valid) {
					if (callback) {
						callback(null);
						return;
					}
				}

				var loader = new KMLLoader(xmlDoc);
				loader.setFilename(file.name);
				if (callback) {
					callback(loader);
				}
			}
		};
		
		reader.readAsText(file);
	};
	
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
		setFilename: function(n) {
			this.fileName = n;
		},
		
		parse: function() {
			this.jXMLDocument.find("Placemark").each(this.readPlacemark.bind(this));
		},
		
		readPlacemark: function(i, element) {
			var j = $(element);
			
			var pid = element.getAttribute('id');
			
			var jPolygons = j.find('Polygon');
			if (jPolygons.length > 0) {
				var pg = this.readPolygon(jPolygons);
				this.polygonList.push(pg);
				
				if (pid) {
					pg.setId(pid);
				}
			}
		},
		
		readPolygon: function(jPolygons) {
			var pg = null;
			var outerBoundaries = jPolygons.find("outerBoundaryIs");
			if (outerBoundaries.length > 0) {
				var outerCoords = this.readPolygonBoundary(outerBoundaries[0]);
				pg = new KMLPolygon();
				pg.outerCoordinates = outerCoords;
				pg.calcCenter();
			}

			if (pg) {
				var innerBoundaries = jPolygons.find("innerBoundaryIs");
				for (var i = 0;i < innerBoundaries.length;++i) {
					this.registerInnerBoundary(pg, innerBoundaries[i]);
				}
			}
			
			return pg;
		},
		
		readPolygonBoundary: function(boundaryElement) {
			var coords = $(boundaryElement).find('coordinates');
			var parsedList = KMLLoader.parseCoordinateList(coords.text());
			KMLLoader.removeDuplicatedEndPoint(parsedList);

			return parsedList;
		},

		registerInnerBoundary: function(outPolygon, boundaryElement) {
			var coords = this.readPolygonBoundary(boundaryElement);
			outPolygon.addInnerBoundary(coords);
		},
		
		getNumOfPolygons: function() {
			return this.polygonList.length;
		},
		
		getPolygonAt: function(i) {
			return this.polygonList[i] || null;
		},
		
		findPolygonById: function(pid) {
			var ls = this.polygonList;
			if (!ls) { return null; }
			
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var pg = ls[i];
				if (pg.getId() === pid) {
					return pg;
				}
			}
			
			return null;
		}
	};
	
	function KMLPolygon() {
		this.cachedGPolygon = null;
		this.outerCoordinates = null;
		this.innerBoundaries = [];
		this._svgElements = null;
		this.attributes = {
			x:0, y:0,
			_id: generateAutoId()
		};
	}
	
	KMLPolygon.prototype = {
		setId: function(id) {
			this.attributes._id = id;
		},
		
		getId: function() {
			return this.attributes._id;
		},
		
		getAttributesMap: function() {
			return this.attributes;
		},
		
		getOuterBoundary: function() {
			return this.outerCoordinates;
		},
		
		getInnerBoundaryAt: function(i) {
			return this.innerBoundaries[i] || null;
		},

		calcCenter: function() {
			var o = this.outerCoordinates;
			if (!o) {
				return;
			}
			
			var sum_x = 0;
			var sum_y = 0;
			
			for (var i in o) {
				var pt = o[i];
				sum_x += pt.x;
				sum_y += pt.y;
			}
			
			this.attributes.x = sum_x / o.length;
			this.attributes.y = sum_y / o.length;
		},

		generateGoogleMapsPaths: function() {
			var paths = [];
			paths.push(
				this.generatePathOfLoop(this.outerCoordinates)
			);
			
			if (this.getNumOfInnerBoundaries()) {
				var ls = this.innerBoundaries;
				var n = ls.length;
				for (var i = 0;i < n;++i) {
					paths.push(
						this.generatePathOfLoop(ls[i])
					);
				}
			}
			
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
		},

		addInnerBoundary: function(coords) {
			this.innerBoundaries.push(coords);
		},
		
		getNumOfInnerBoundaries: function() {
			if (!this.innerBoundaries) { return 0; }
			return this.innerBoundaries.length;
		},
		
		getGMapPolygon: function() {
			if (!this.cachedGPolygon) {
				this.cachedGPolygon = new google.maps.Polygon({
					paths: this.generateGoogleMapsPaths()
				});
			}
			
			return this.cachedGPolygon;
		},

		// High level collision API  - - - - - - - - -
		checkCrossOrContain: function(x1, y1, x2, y2) {
			// [Contain] case
			if (this.checkLatLngContained(y1, x1) || this.checkLatLngContained(y2, x2)) {
				return true;
			}

			// [Through] case
			if (this.checkAnyEdgeCross(x1, y1, x2, y2)) {
				return true;
			}
			
			return false;
		},
		// - - - - - - - - - - - - - - - - - - - - - -
		
		checkLatLngContained: function(lat, lng) {
			var ll = _tempLatLng;
			ll._lat = lat;
			ll._lng = lng;

			return google.maps.geometry.poly.containsLocation(ll, this.getGMapPolygon());
		},

		checkAnyEdgeCross: function(x1, y1, x2, y2) {
			if (this.checkCrossWithLoop(this.outerCoordinates, x1, y1, x2, y2)) {
				return true;
			}
			
			if (this.getNumOfInnerBoundaries() > 0) {
				var ins = this.innerBoundaries;
				for (var i in ins) {
					if (this.checkCrossWithLoop(ins[i], x1, y1, x2, y2)) {
						return true;
					}
				}
			}
			
			return false;
		},
		
		checkCrossWithLoop: function(loopCoordinates, ex1, ey1, ex2, ey2) {
			var len = loopCoordinates.length;
			for (var i = 0;i < len;++i) {
				var p1 = loopCoordinates[i];
				var p2 = loopCoordinates[(i+1) % len];
				
				if (testSegmentCross(p1.x, p1.y, p2.x, p2.y, ex1, ey1, ex2, ey2, false) !== null) {
					return true;
				}
			}
			
			return false;
		}
	};
	
	function LightLatLng() {
		this._lat = 0;
		this._lng = 0;
	}
	
	LightLatLng.prototype = {
		lat: function() {
			return this._lat;
		},
		
		lng: function() {
			return this._lng;
		}
	};
	
	var generateAutoId = (function() {
		var nextid = 1;
		return function() {
			return 'autoid_' + (nextid++);
		};
	})();

	var _tempLatLng = new LightLatLng();
	KMLLoader.LightLatLng = LightLatLng;
	aGlobal.mobmap.KMLLoader = KMLLoader;
})(window);