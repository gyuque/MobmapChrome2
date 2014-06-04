if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var kSVGNS = 'http://www.w3.org/2000/svg';
	var kDefaultFillColor = 'rgba(10,30,255, 0.8)';
	var kWeakFillColor = 'rgba(120,128,136, 0.5)';
	
	function installPolygonOverlay(pkg) {
	
		function PolygonOverlay() {
			this.visible = true;
			this.zoomListener = null;
			this.svgGroupElementList = [];
			this.targetPane = 'overlayLayer';
			this.polygonDataSource = null;
			this.featuresContainerElement = null;
			this.projectionGrid = new mobmap.FastProjectionGrid(9);

			this.ownerObject = null;
		}

		// Inherit
		PolygonOverlay.prototype = new google.maps.OverlayView();
		PolygonOverlay.prototype.updateProjectionGrid = mobmap.GLMobLayer.overlaybase_updateProjectionGrid;

		PolygonOverlay.prototype.draw = function() {
			this.clearCurrentPaths();
			setTimeout(this.updatePolygonCoordinates.bind(this), 17);
		};

		PolygonOverlay.prototype.onAdd = function() {
			var panes = this.getPanes();
			panes[this.targetPane].appendChild( this.ensureContainerElement() );
			this.ensureSVGElementGenerated();
		
			var map = this.getMap();
			this.zoomListener = google.maps.event.addListener(map, 'zoom_changed', this.onMapZoomChanged.bind(this) );
		};

		PolygonOverlay.prototype.willRemove = function() {
		
		};
	
		PolygonOverlay.prototype.onRemove = function() {
			this.canvas.parentNode.removeChild(this.canvas);
		};

		PolygonOverlay.prototype.onMapZoomChanged = function() {
		};

		PolygonOverlay.prototype.ensureContainerElement = function() {
			if (!this.featuresContainerElement) {
				this.featuresContainerElement = document.createElement('div');
				this.featuresContainerElement.className = 'mm-pg-svg-container';
			}
		
			return this.featuresContainerElement;
		};
	
		PolygonOverlay.prototype.setDataSource = function(polygonDataSource) {
			this.polygonDataSource = polygonDataSource;
			this.ensureSVGElementGenerated();
		};
	
		PolygonOverlay.prototype.ensureSVGElementGenerated = function() {
			var ds = this.polygonDataSource;
			if (!ds) {
				return;
			}
		
			if (!this.featuresContainerElement) {
				return;
			}
		
			this.updateProjectionGrid(this.projectionGrid);
			var n = ds.getNumOfPolygons();
			for (var i = 0;i < n;++i) {
				var pg = ds.getPolygonAt(i);
				if (!pg._svgElements) {
					this.createPolygonSVG(pg);
				}
			}
		};
	
		PolygonOverlay.prototype.createPolygonSVG = function(sourcePolygon) {
			var svgElement = document.createElementNS(kSVGNS, 'svg');
			var svgG = document.createElementNS(kSVGNS, 'g');

			svgElement.appendChild(svgG);
			this.featuresContainerElement.appendChild(svgElement);
		
			var outerBounds = {};
			var coordList = [];
			var outer = sourcePolygon.getOuterBoundary();
		
			var pathElement = document.createElementNS(kSVGNS, 'path');
			// pathElement.setAttribute('class', 'mm-polygon-path');
			this.generatePathCoordinates(coordList, outer, outerBounds);
			this.generateInnderBoundaryCoordinates(coordList, sourcePolygon);
			pathElement.setAttribute('d', coordList.join(' '));
	
			svgG.setAttribute('fill', kDefaultFillColor);
			svgG.setAttribute('fill-rule', 'evenodd');

			sourcePolygon._svgElements = {
				svg: svgElement,
				g: svgG,
				path: pathElement
			};

			svgG.setAttribute('data-id', sourcePolygon.getId());
			svgG.appendChild(pathElement);
			this.applyPolygonBounds(svgElement, outerBounds);
			this.svgGroupElementList.push(svgG);
		};
	
		PolygonOverlay.prototype.generateInnderBoundaryCoordinates = function(outList, sourcePolygon) {
			var n = sourcePolygon.getNumOfInnerBoundaries();
			if (n < 1) {
				return 0;
			}
		
			for (var i = 0;i < n;++i) {
				var innerCoords = sourcePolygon.getInnerBoundaryAt(i);
				this.generatePathCoordinates(outList, innerCoords, null);
			}
		
			return n;
		};

		PolygonOverlay.prototype.applyPolygonBounds = function(svgElement, outerBounds) {
			var ow = outerBounds.maxX - outerBounds.minX;
			var oh = outerBounds.maxY - outerBounds.minY;
			svgElement.setAttribute('viewBox', outerBounds.minX +' '+ outerBounds.minY + ' ' + ow +' '+ oh);
			svgElement.setAttribute('width', ow);
			svgElement.setAttribute('height', oh);
		
			svgElement.style.position = 'absolute';
			setElementStylePosition(svgElement.style, outerBounds.minX, outerBounds.minY);
		};
		
		var _tempProjPoint = {
			screenX:0, screenY:0,
			lat:0, lng:0
		};

		PolygonOverlay.prototype.generatePathCoordinates = function(outList, coords, boundsOut) {
			var prj = this.getProjection();
			if (!prj) {return null;}
		
			var minX = 0x7fffffff;
			var minY = 0x7fffffff;
			var maxX = -minX;
			var maxY = -minY;

			var pgrid = this.projectionGrid;
			var projPt = _tempProjPoint;
			var n = coords.length;
			for (var i = 0;i < n;++i) {
				var pt = coords[i];
				projPt.lat = pt.y;
				projPt.lng = pt.x;
				pgrid.calc(projPt);
				var dx = projPt.screenX;
				var dy = projPt.screenY;

				outList.push( ((i==0) ? 'M' : 'L') + dx+','+dy);
			
				minX = Math.min(dx, minX);
				minY = Math.min(dy, minY);
				maxX = Math.max(dx, maxX);
				maxY = Math.max(dy, maxY);
			}

			if (boundsOut) {
				boundsOut.minX = minX;
				boundsOut.minY = minY;
				boundsOut.maxX = maxX;
				boundsOut.maxY = maxY;
			}
		
			return outList;
		};
	
		PolygonOverlay.prototype.updatePolygonCoordinates = function() {
			var ds = this.polygonDataSource;
			if (!ds) { return; }
		
			this.updateProjectionGrid(this.projectionGrid);
			var n = ds.getNumOfPolygons();
			for (var i = 0;i < n;++i) {
				var pg = ds.getPolygonAt(i);
				if (pg._svgElements) {
					this.updatePolygonCoordinatesOfKMLPolygon(pg);
				}
			}
		};

		PolygonOverlay.prototype.updatePolygonCoordinatesOfKMLPolygon = function(kmlPolygon) {
			var elementSet = kmlPolygon._svgElements;
			var pathElement = elementSet.path;
		
			var outer = kmlPolygon.getOuterBoundary();
			var outerBounds = {};
			var coordList = [];
		
			this.generatePathCoordinates(coordList, outer, outerBounds);
			this.generateInnderBoundaryCoordinates(coordList, kmlPolygon);
		
			pathElement.setAttribute('d', coordList.join(' '));
			this.applyPolygonBounds(elementSet.svg, outerBounds);
		};
	
		PolygonOverlay.prototype.clearCurrentPaths = function() {
			var ds = this.polygonDataSource;
			if (!ds) { return; }
		
			var n = ds.getNumOfPolygons();
			for (var i = 0;i < n;++i) {
				var pg = ds.getPolygonAt(i);
				if (pg._svgElements) {
					pg._svgElements.path.setAttribute('d', 'M0,0');
				}
			}
		};

		PolygonOverlay.prototype.setVisibility = function(v) {
			if (this.visible === v) {
				return;
			}
			
			this.featuresContainerElement.style.visibility = v ? '' : 'hidden';
			this.visible = v;
		};
		
		PolygonOverlay.prototype.updateSelectionView = function(idmap) {
			var glist = this.svgGroupElementList;
			var len = glist.length;
			
			for (var i = 0;i < len;++i) {
				var gElement = glist[i];
				var pid = gElement.getAttribute('data-id');
				var clr = kDefaultFillColor;
				
				if (idmap) {
					if (!idmap[pid]) {
						clr = kWeakFillColor;
					}
				}
				
				gElement.setAttribute('fill', clr);
			}
		};

		// Polygon overlay does not have 'canvas' as a variable.
		Object.defineProperty(PolygonOverlay.prototype, "canvas", {
			get: function canvas() { return this.featuresContainerElement; }
		});
		
		function setElementStylePosition(s, x, y) {
			s.left = x + 'px';
			s.top = y + 'px';
		}

		pkg.PolygonOverlay = PolygonOverlay;
	}
	
	if (window.ENABLE_MOBMAP_LAZY_LOAD) {
		window.mobmap.installPolygonOverlay = function() { installPolygonOverlay(window.mobmap); };
	} else {
		installPolygonOverlay(window.mobmap);
	}
})(window);