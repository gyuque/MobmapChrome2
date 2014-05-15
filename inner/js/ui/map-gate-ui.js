if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var ONMAPBTN_SHADOW = "./images/onmapbutton-shadow.png";
	var ONMAPBTN_OK  = "./images/onmapbutton-chk.png";
	var ONMAPBTN_X   = "./images/onmapbutton-x.png";
	var ONMAPBTN_DIR = "./images/onmapbutton-dir.png";
	var ONMAPBTN_ADD = "./images/onmapbutton-add.png";

	
	function MapGateUI(gmap, listener) {
		mobmap.mm_initMapButtonsLayer(mobmap);
		this.resetDirection();
		
		this.gmap = gmap;
		this.lineOverlay = null;
		this.directionIconOverlay = null;
		this.buttonsOverlay = null;
		this.pathArray = [null, null];
		this.listener = listener;
		
		this.setupOverlays(gmap);
	}
	
	MapGateUI.prototype = {
		getStartLocation: function() { return this.pathArray[0] || null; },		
		getEndLocation:   function() { return this.pathArray[1] || null; },
		getGateDirection: function() { return this.direction; },

		resetDirection: function() {
			this.direction = GateDirection.Bidirectional;
		},
		
		toggleDirection: function() {
			if (this.direction === GateDirection.Bidirectional) {
				this.direction = GateDirection.Forward;
			} else {
				++this.direction;
			}
		},
		
		setupOverlays: function(gmap) {
			this.arrowDynamicIcon = new mobmap.ArrowDynamicIcon();
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
			var btnAdd = new mobmap.MapButtonsLayer.ImageButton(ONMAPBTN_ADD, ONMAPBTN_SHADOW, 'add');

			this.buttonsOverlay.addButton(btnOK);
			this.buttonsOverlay.addButton(btnDir);
			this.buttonsOverlay.addButton(btnAdd);
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
			this.directionIconOverlay = new google.maps.Marker();
			
			this.directionIconOverlay.setMap(gmap);
			this.directionIconOverlay.setVisible(false);
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
			
			this.configureArrow();
			this.updateDirectionIcon();
		},
		
		hide: function() {
			this.lineOverlay.setVisible(false);
			this.directionIconOverlay.setVisible(false);
			this.buttonsOverlay.hideAll();
		},
		
		updateDirectionIcon: function() {
			this.calcGateAngle();
			
			var p1 = this.pathArray[0];
			var p2 = this.pathArray[1];
			var midPt = new google.maps.LatLng( (p1.lat() + p2.lat()) / 2.0, (p1.lng() + p2.lng()) / 2.0 );

			this.arrowDynamicIcon.updateBitmap();
			this.directionIconOverlay.setIcon( this.arrowDynamicIcon.generateIcon() );
			this.directionIconOverlay.setPosition(midPt);
			this.directionIconOverlay.setVisible(true);
		},
		
		getUpperPoint: function() {
			var p1 = this.pathArray[0];
			var p2 = this.pathArray[1];
			
			return (p1.lat() > p2.lat()) ? p1 : p2;
		},

		calcGateAngle: function() {
			var p1 = this.pathArray[0];
			var p2 = this.pathArray[1];
			
			var dy = p2.lat() - p1.lat();
			var dx = p2.lng() - p1.lng();
			
			var a = Math.atan2(dy, dx);
			this.arrowDynamicIcon.angle = a;
			return a;
		},
		
		onOnmapButtonClick: function(e, button) {
			switch(button.name) {
			case 'ok':
				this.onOK(); break;
			case 'cancel':
				this.hide(); break;
			case 'dir':
				this.changeDirectionAndRedraw(); break;
			case 'add':
				this.onAdd(); break;
			}
		},
		
		changeDirectionAndRedraw: function() {
			this.toggleDirection();
			this.configureArrow();
			this.updateDirectionIcon();
		},
		
		setDirection: function(d) {
			this.direction = d;
			this.configureArrow();
			this.updateDirectionIcon();
		},
		
		configureArrow: function() {
			this.arrowDynamicIcon.enableFwdArrow  = (this.direction !== GateDirection.Back);
			this.arrowDynamicIcon.enableBackArrow = (this.direction !== GateDirection.Forward);
		},
		
		onOK: function() {
			if (this.listener && this.listener.gateuiOnOK) {
				this.listener.gateuiOnOK(this);
			}
		},
		
		onAdd: function() {
			if (this.listener && this.listener.gateuiOnAdd) {
				this.listener.gateuiOnAdd(this);
			}
		}
	};
	
	MapGateUI.isEndsValid = function(e1, e2) {
		if (isNumbersNear(e1.lat, e2.lat) && isNumbersNear(e1.lng, e2.lng)) {
			return false;
		}
			
		return true;
	}
	
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
				e.preventDefault();
				e.stopPropagation();
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


(function(pkg) {
	'use strict';
	var DI_SIZE = 25;
	
	function ArrowDynamicIcon() {
		this.canvas = document.createElement("canvas");
		this.canvas.width = DI_SIZE;
		this.canvas.height = DI_SIZE;
		this.g = this.canvas.getContext("2d");
		
		this.icon = {};
		this.generateIcon();
		
		this.angle = 0;
		this.enableFwdArrow  = true;
		this.enableBackArrow = true;
	}
	
	ArrowDynamicIcon.prototype = {
		generateIcon: function() {
			this.icon.anchor = new google.maps.Point(DI_SIZE >> 1, DI_SIZE >> 1);
			this.icon.url = this.canvas.toDataURL();
			
			return this.icon;
		},
		
		updateBitmap: function() {
			this.clear();
			
			this.g.lineCap = 'square';
			this.g.lineJoin = 'miter';

			this.g.strokeStyle = "rgba(0,0,100,0.4)";
			this.g.lineWidth = 5;
			this.renderArrowLines();
			
			this.g.strokeStyle = "#00d";
			this.g.lineWidth = 4;
			this.renderArrowLines();
			
			this.g.strokeStyle = "#fff";
			this.g.lineWidth = 2;
			this.renderArrowLines();
		},
		
		renderArrowLines: function() {
			var r = 10;
			var cx = DI_SIZE >> 1;
			var cy = DI_SIZE >> 1;
			
			this.makeArrowPath(this.angle, r, cx, cy);
			this.g.stroke();

			if (this.enableFwdArrow) {
				this.makeCapPath(Math.PI + this.angle, r, cx, cy);
				this.g.stroke();
			}

			if (this.enableBackArrow) {
				this.makeCapPath(this.angle, r, cx, cy);
				this.g.stroke();
			}
		},
		
		makeArrowPath: function(a, r, cx, cy) {
			r -= 1;
			
			var x1 = -Math.sin(a) * r + cx;
			var y1 = -Math.cos(a) * r + cy;
			
			var x2 = Math.sin(a) * r + cx;
			var y2 = Math.cos(a) * r + cy;

			var g = this.g;
			
			g.beginPath();
			g.moveTo(x1, y1);
			g.lineTo(x2, y2);
		},
		
		makeCapPath: function(a, r, cx, cy) {
			var a0 = a + 0.5;
			var a2 = a - 0.5;
			var dr = r - 2;
			
			var x1 = Math.sin(a) * r + cx;
			var y1 = Math.cos(a) * r + cy;
			
			var x0 = Math.sin(a0) * dr + cx;
			var y0 = Math.cos(a0) * dr + cy;
			
			var x2 = Math.sin(a2) * dr + cx;
			var y2 = Math.cos(a2) * dr + cy;

			var g = this.g;
			g.beginPath();
			g.moveTo(x0, y0);
			g.lineTo(x1, y1);
			g.lineTo(x2, y2);
		},
		
		clear: function() {
			this.g.clearRect(0, 0, DI_SIZE, DI_SIZE);
		}
	};
	
	pkg.ArrowDynamicIcon = ArrowDynamicIcon;
})(mobmap);