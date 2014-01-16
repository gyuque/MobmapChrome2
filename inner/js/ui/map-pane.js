if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var DARKMAP_ID = 'dark';

	function MapPane(containerElement) {
		this.gmap = null;
		this.ownerApp = null;
		
		this.initialLocation = {
			zoom: 8,
			lat: 36.7,
			lng: 138.7
		};
		// ----------------------------------------------------------
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		
		this.setupGoogleMaps();
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
			/*
			this.mobLayer = new mobmap.GLMobLayer();
			this.mobLayer.canvasReadyCallback = this.onLayerCanvasReady.bind(this);
			this.mobLayer.setMap(this.gmap);
			*/
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
			var targetProject = this.ownerApp.getCurrentPeoject();
			if (!targetProject) {return;}
			
			var targetTime = targetProject.currentDateTime;
			var sec = targetTime.getCurrentTime();
			
			// ----------------------------------------------------------------------------
			//  Rendering routine is not here.
			//  Event observer will render overlays.
			this.eventDispatcher().trigger(MapPane.NEED_OVERLAYS_RENDER_EVENT, [this, sec]);
			// ----------------------------------------------------------------------------
		}
	};

	// +++ Export +++
	aGlobal.mobmap.MapPane = MapPane;
})(window);