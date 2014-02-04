if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var DARKMAP_ID = 'dark';

	var PMODE_DEFAULT  = 0;
	var PMODE_DRAG_SEL = 1;

	function MapPane(containerElement) {
		this.gmap = null;
		this.ownerApp = null;
		this.darkMapType = null;
		
		this.pointingMode = PMODE_DEFAULT;
		
		this.initialLocation = {
			zoom: 8,
			lat: 36.7,
			lng: 138.7
		};
		// ----------------------------------------------------------
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		
		this.setupGoogleMaps();
		this.setupCaptureEvents();
	}
	
	MapPane.NEED_OVERLAYS_RENDER_EVENT = "mappane-needs-overalys-render";
	
	MapPane.prototype = {
		eventDispatcher: function() {
			return this.jContainerElement;
		},
		
		setApp: function(a) {
			this.ownerApp = a;
		},
		
		getGoogleMaps: function() {
			return this.gmap;
		},
		
		observeContainerEvents: function(app3PanesView) {
			app3PanesView.eventDispatcher().bind(mobmap.Mobmap3PanesScreen.RESIZE_EVENT,
				this.onContainerResize.bind(this));
		},
		
		observeProjectEvents: function(prj) {
			prj.currentDateTime.eventDispatcher().bind(
				mobmap.DateTime.CURRENT_TIME_CHANGE_EVENT,
				this.onCurrentDateTimeChange.bind(this)
			);
		},

		connectToSelectionController: function(selcon) {
			selcon.addResponder(this);
		},

		onContainerResize: function() {
			if (this.gmap) {
				google.maps.event.trigger(this.gmap, 'resize');
			}
		},

		setupGoogleMaps: function(overrideInitialCenter) {
			if (overrideInitialCenter) {
				this.initialLocation.lat = overrideInitialCenter.lat;
				this.initialLocation.lng = overrideInitialCenter.lng;
			}
			
			var mapOptions = {
				zoom: this.initialLocation.zoom,
				center: new google.maps.LatLng(this.initialLocation.lat, this.initialLocation.lng),

				mapTypeId: google.maps.MapTypeId.ROADMAP,
				mapTypeControlOptions: {
					mapTypeIds: this.generateDefaultMapTypeList()
				}
			};

			this.gmap = new google.maps.Map(this.containerElement, mapOptions);
			this.setupDarkMap(this.gmap, "Dark");
			/*
			this.mobLayer = new mobmap.GLMobLayer();
			this.mobLayer.canvasReadyCallback = this.onLayerCanvasReady.bind(this);
			this.mobLayer.setMap(this.gmap);
			*/
		},

		setupCaptureEvents: function() {
			var el = this.containerElement;
			el.addEventListener('mousedown', this.captureMouseDown.bind(this), true);
			el.addEventListener('mousemove', this.captureMouseMove.bind(this), true);
			el.addEventListener('mouseup',   this.captureMouseUp.bind(this),   true);
		},

		setupDarkMap: function(gmap, typeName) {
			if (this.darkMapType) {return;}
			
			var darkMap = new google.maps.StyledMapType(kDarkMapStyle, {
			                                             map: gmap, name: typeName
			                                            });
			gmap.mapTypes.set(DARKMAP_ID, darkMap);
			this.darkMapType = darkMap;
		},
		
		generateDefaultMapTypeList: function() {
			return [
				google.maps.MapTypeId.HYBRID,
				google.maps.MapTypeId.ROADMAP,
				google.maps.MapTypeId.SATELLITE,
				google.maps.MapTypeId.TERRAIN,
				DARKMAP_ID
			];
		},

		onCurrentDateTimeChange: function(e, sender) {
			this.redraw();
		},

		redraw: function() {
			var targetProject = this.ownerApp.getCurrentProject();
			if (!targetProject) {return;}
			
			var targetTime = targetProject.currentDateTime;
			var sec = targetTime.getCurrentTime();
			
			// ----------------------------------------------------------------------------
			//  Rendering routine is not here.
			//  Event observer will render overlays.
			this.eventDispatcher().trigger(MapPane.NEED_OVERLAYS_RENDER_EVENT, [this, sec]);
			// ----------------------------------------------------------------------------
		},
		
		enterDragSelectionMode: function() {
			this.pointingMode = PMODE_DRAG_SEL;
			this.changePointerStyle();
		},
		
		leaveSpecialPointingMode: function() {
			this.pointingMode = PMODE_DEFAULT;
			this.changePointerStyle();
		},
		
		changePointerStyle: function() {
			var j = this.jContainerElement;
			if (this.pointingMode === PMODE_DRAG_SEL) {
				j.addClass('on-selection');
			} else {
				j.removeClass('on-selection');
			}
		},
		
		// capture events
		captureMouseDown: function(e) {
			this.blockMouseEventIfNeeded(e);
		},

		captureMouseMove: function(e) {
			this.blockMouseEventIfNeeded(e);
		},

		captureMouseUp: function(e) {
			this.blockMouseEventIfNeeded(e);
		},
		
		blockMouseEventIfNeeded: function(e) {
			if (this.pointingMode === PMODE_DRAG_SEL) {
				e.stopPropagation();
				e.preventDefault();
			}
		},

		// - - - - - - - - - - - - - - - -
		// Selection Controller Responders
		
		selDidStartNewSession: function(selController) {
			var sess = selController.getCurrentSession();
			if (sess) {
				var drg_mode = sess.isDraggingSelectionRecommended();
				if (drg_mode) {
					this.enterDragSelectionMode();
				}
			}
		}
	};

	// +++ Export +++
	aGlobal.mobmap.MapPane = MapPane;
})(window);