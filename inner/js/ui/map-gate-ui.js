if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var ONMAPBTN_SHADOW = "./images/onmapbutton-shadow.png";
	var ONMAPBTN_OK  = "./images/onmapbutton-chk.png";
	var ONMAPBTN_X   = "./images/onmapbutton-x.png";
	var ONMAPBTN_DIR = "./images/onmapbutton-dir.png";

	
	function MapGateUI(gmap) {
		mobmap.mm_initMapButtonsLayer(mobmap);
		
		this.gmap = gmap;
		this.lineOverlay = null;
		this.buttonsOverlay = null;
		this.pathArray = [null, null];
		
		this.setupOverlays(gmap);
	}
	
	MapGateUI.prototype = {
		setupOverlays: function(gmap) {
			this.setupOnMapButtons(gmap);
			this.setupLineOverlay(gmap);
			this.setupDirectionIconOverlay(gmap);
		},
		
		setupOnMapButtons: function(gmap) {
			this.buttonsOverlay = new mobmap.MapButtonsLayer();
			this.buttonsOverlay.setMap(gmap);
			this.buttonsOverlay.observeMapEvents(gmap);
			this.buttonsOverlay.eventDispatcher().bind(mobmap.MapButtonsLayer.MAPBUTTONEVENT_CLICK, this.onOnmapButtonClick.bind(this));
			
			var btnOK  = new mobmap.MapButtonsLayer.ImageButton(ONMAPBTN_OK, ONMAPBTN_SHADOW, 'ok');
			var btnDir = new mobmap.MapButtonsLayer.ImageButton(ONMAPBTN_DIR, ONMAPBTN_SHADOW, 'dir');
			var btnX   = new mobmap.MapButtonsLayer.ImageButton(ONMAPBTN_X, ONMAPBTN_SHADOW, 'cancel');

			this.buttonsOverlay.addButton(btnOK);
			this.buttonsOverlay.addButton(btnDir);
			this.buttonsOverlay.addButton(btnX);
			
			this.buttonsOverlay.hideAll();
		},
		
		setupLineOverlay: function(gmap) {
			this.lineOverlay = new google.maps.Polyline({
				strokeColor: "#2233ff",
				strokeOpacity: 1,
				strokeWeight: 2
			});
			
			this.lineOverlay.setMap(gmap);
			this.lineOverlay.setVisible(false);
		},
		
		setupDirectionIconOverlay: function(gmap) {
			
		},
		
		setEnds: function(e1, e2) {
			this.pathArray[0] = new google.maps.LatLng( e1.lat, e1.lng );
			this.pathArray[1] = new google.maps.LatLng( e2.lat, e2.lng );
		},
		
		show: function() {
			if (!this.pathArray[0]) { return; }

			this.lineOverlay.setPath(this.pathArray);
			this.lineOverlay.setVisible(true);

			var endPt = this.getUpperPoint();
			this.buttonsOverlay.setCenterLatLng(endPt.lat(), endPt.lng());
			this.buttonsOverlay.showAll();
		},
		
		hide: function() {
			this.lineOverlay.setVisible(false);
			this.buttonsOverlay.hideAll();
		},
		
		getUpperPoint: function() {
			var p1 = this.pathArray[0];
			var p2 = this.pathArray[1];
			
			return (p1.lat() > p2.lat()) ? p1 : p2;
		},
		
		onOnmapButtonClick: function(e, button) {
			switch(button.name) {
			case 'cancel':
				this.hide(); break;
			}
		}
	};
	
	aGlobal.mobmap.MapGateUI = MapGateUI;
})(window);


window.mobmap.mm_initMapButtonsLayer = (function(pkg) {
	'use strict';
	
	if (pkg.MapButtonsLayer) { return; }
	
	function MapButtonsLayer() {
		this.zoomListener = null;
		this.centerLL = new google.maps.LatLng(36, 139);
		this.buttonList = [];
		this.targetPane = 'overlayMouseTarget';
		this.containerElement = null;
		this.containerElementReady = document.createElement("div");
		this.jContainerElementReady = $(this.containerElementReady);
		this.jContainerElementReady.click(this.onClick.bind(this));
	}
	
	MapButtonsLayer.MAPBUTTONEVENT_CLICK = "map-button-click";
	
	MapButtonsLayer.prototype = new google.maps.OverlayView();
	
	MapButtonsLayer.prototype.eventDispatcher = function() {
		return this.jContainerElementReady;
	};
	
	MapButtonsLayer.prototype.draw = function() {
		this.ensureContainerElement();
	};
	
	MapButtonsLayer.prototype.ensureContainerElement = function() {
		if (!this.containerElement) {
			this.containerElement = this.containerElementReady;
			var s = this.containerElement.style;
			s.position = "relative";

			var panes = this.getPanes();
			panes[this.targetPane].appendChild( this.containerElement );
		}
		
		return this.containerElement;
	};
	
	MapButtonsLayer.prototype.addButton = function(btn) {
		this.containerElementReady.appendChild(btn.element);
		this.buttonList.push(btn);
	};
	
	MapButtonsLayer.prototype.findButtonByName = function(name) {
		var len = this.buttonList.length;
		for (var i = 0;i < len;++i) {
			var btn = this.buttonList[i];
			if (btn.name == name) { return btn; }
		}
		
		return null;
	};
	
	MapButtonsLayer.prototype.setCenterLatLng = function(lat, lng) {
		this.centerLL = new google.maps.LatLng(lat, lng);
		this.updateDisplayPosition();
	};
	
	MapButtonsLayer.prototype.updateDisplayPosition = function() {
		var pj = this.getProjection();
		var centerPt = pj.fromLatLngToDivPixel(this.centerLL);

		var len = this.buttonList.length;
		if (len < 1) {
			return;
		}

		var padding = 2;
		var w = 18;
		var x = (len - 1) * -((w + padding) >> 1);
		
		for (var i = 0;i < len;++i) {
			var btn = this.buttonList[i];
			btn.setPosition(centerPt.x + x, centerPt.y - 16);
			
			x += w + padding;
		}
	};
	
	MapButtonsLayer.prototype.hideAll = function() {
		var ls = this.buttonList;
		var len = ls.length;
		for (var i = 0;i < len;++i) {
			ls[i].hide();
		}
	};

	MapButtonsLayer.prototype.showAll = function() {
		var ls = this.buttonList;
		var len = ls.length;
		for (var i = 0;i < len;++i) {
			ls[i].show();
		}
	};
	
	MapButtonsLayer.prototype.observeMapEvents = function(map) {
		this.zoomListener = google.maps.event.addListener(map, 'zoom_changed', this.onMapZoomChanged.bind(this) );
	};
	
	MapButtonsLayer.prototype.onMapZoomChanged = function() {
		this.updateDisplayPosition();
	};
	
	MapButtonsLayer.prototype.onClick = function(e) {
		if (e.target) {
			var name = e.target.getAttribute("data-button-name");
			var btn = this.findButtonByName(name);
			if (btn) {
				this.eventDispatcher().trigger(MapButtonsLayer.MAPBUTTONEVENT_CLICK, btn);
			}
		}
	};
	
	// Button - - - - - - - - - - - - - - -
	MapButtonsLayer.ImageButton = function(imageURL, backgroundURL, name) {
		this.name = name;
		this.element = document.createElement("img");
		this.element.src = imageURL;
		this.element.setAttribute("data-button-name", name);
		this.element.setAttribute("class", "onmap-button-image");
		this.jElement = $(this.element);
		
		this.initStyle(this.element.style, backgroundURL);
		this.stopMouseEvents(this.element);
	};
	
	MapButtonsLayer.ImageButton.prototype = {
		stopMouseEvents: function(target) {
			target.addEventListener('dblclick', this.stopHandler, false);
		},
		
		stopHandler: function(e) {
			e.preventDefault();
			e.stopPropagation();
		},
		
		
		initStyle: function(s, backgroundURL) {
			s.position = "absolute";
			s.cursor = "pointer";
			if (backgroundURL) {
				s.background = "no-repeat top left url("+backgroundURL+")";
			}
			
			s.top = 0;
			s.left = 0;
		},
		
		setPosition: function(x, y) {
			var s = this.element.style;
			s.left = ((x - 9) | 0) + "px";
			s.top  = ((y - 9) | 0) + "px";
		},
		
		show: function() {
			this.jElement.show();
		},
		
		hide: function() {
			this.jElement.hide();
		}
	};
	
	// Export
	pkg.MapButtonsLayer = MapButtonsLayer;
});
