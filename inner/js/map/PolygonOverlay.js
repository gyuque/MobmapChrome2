if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var kSVGNS = 'http://www.w3.org/2000/svg';
	
	function PolygonOverlay() {
		this.svgElementList = [];
		this.targetPane = 'overlayLayer';
		this.polygonDataSource = null;
		this.featuresContainerElement = null;
	}

	// Inherit
	PolygonOverlay.prototype = new google.maps.OverlayView();

	PolygonOverlay.prototype.draw = function() {
		
	};

	PolygonOverlay.prototype.onAdd = function() {
		var panes = this.getPanes();
		panes[this.targetPane].appendChild( this.ensureContainerElement() );
		this.ensureSVGElementGenerated();
	};
	
	PolygonOverlay.prototype.onRemove = function() {
		
	};

	PolygonOverlay.prototype.ensureContainerElement = function() {
		if (!this.featuresContainerElement) {
			this.featuresContainerElement = document.createElement('div');
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
		var outer = sourcePolygon.getOuterBoundary();
		var outerPolygon = this.createPolygonElementFromCoordinates(outer, outerBounds);
		svgG.appendChild(outerPolygon);
		console.log(outerBounds)
		
		svgG.setAttribute('fill', 'red');

		sourcePolygon._svgElements = {
			svg: svgElement,
			g: svgG,
			outerPolygon: outerPolygon
		};
		
		var ow = outerBounds.maxX-outerBounds.minX;
		var oh = outerBounds.maxY-outerBounds.minY;
		svgElement.setAttribute('viewBox', outerBounds.minX +' '+ outerBounds.minY + ' ' + ow +' '+ oh);
		svgElement.setAttribute('width', ow);
		svgElement.setAttribute('height', oh);
		
		svgElement.style.position = 'absolute';
		setElementStylePosition(svgElement.style, outerBounds.minX, outerBounds.minY);
	};
	
	PolygonOverlay.prototype.createPolygonElementFromCoordinates = function(coords, boundsOut) {
		var prj = this.getProjection();
		if (!prj) {return null;}
		
		var svgCoords = [];
		var minX = 0x7fffffff;
		var minY = 0x7fffffff;
		var maxX = -minX;
		var maxY = -minY;

		var n = coords.length;
		for (var i = 0;i < n;++i) {
			var pt = coords[i];
			var divPt = prj.fromLatLngToDivPixel(new google.maps.LatLng(pt.y, pt.x));
			svgCoords.push(divPt.x+','+divPt.y);
			
			minX = Math.min(divPt.x, minX);
			minY = Math.min(divPt.y, minY);
			maxX = Math.max(divPt.x, maxX);
			maxY = Math.max(divPt.y, maxY);
		}
		
		var svgPolygon = document.createElementNS(kSVGNS, 'polygon');
		svgPolygon.setAttribute('points', svgCoords.join(' '));
		
		if (boundsOut) {
			boundsOut.minX = minX;
			boundsOut.minY = minY;
			boundsOut.maxX = maxX;
			boundsOut.maxY = maxY;
		}
		
		return svgPolygon;
	};
	
	function setElementStylePosition(s, x, y) {
		s.left = x + 'px';
		s.top = y + 'px';
	}

	aGlobal.mobmap.PolygonOverlay = PolygonOverlay;
})(window);