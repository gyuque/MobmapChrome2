if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var DARKMAP_ID = 'dark';

	var PMODE_DEFAULT  = 0;
	var PMODE_DRAG_SEL = 1;
	
	var SEL_FEEDBACK_RECT = 0;
	var SEL_FEEDBACK_LINE = 1;

	function MapPane(containerElement) {
		this.gmap = null;
		this.ownerApp = null;
		this.darkMapType = null;
		this.pointingMode = PMODE_DEFAULT;
		this.nowCapturingDrag = false;
		this.prevRenderTargetTime = -1;

		// Preview overlays
		this.selectionPolygonpath    = null;
		this.selectionPreviewPolygon = null;
		this.selectionLinepath    = null;
		this.selectionPreviewLine = null;

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
		this.setupSelectionViews();
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
		
		panTo: function(lat, lng) {
			this.getGoogleMaps().panTo(new google.maps.LatLng(lat, lng));
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
			var sec = targetTime.getCurrentTimeAsInt();
			
			var dt = sec - this.prevRenderTargetTime;
			var timeDir = (dt > 0) ? 1 : (dt < 0) ? -1 : 0;
			
			// ----------------------------------------------------------------------------
			//  Rendering routine is not here.
			//  Event observer will render overlays.
			this.eventDispatcher().trigger(MapPane.NEED_OVERLAYS_RENDER_EVENT, [this, sec, timeDir]);
			// ----------------------------------------------------------------------------
			
			this.prevRenderTargetTime = sec;
		},

		enterDragSelectionMode: function() {
			this.pointingMode = PMODE_DRAG_SEL;
			this.changePointerStyle();
		},
		
		leaveSpecialPointingMode: function() {
			this.nowCapturingDrag = false;
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
			this.sendFirstSelectionPoint(e);
			this.blockMouseEventIfNeeded(e);
			this.nowCapturingDrag = true;
		},

		captureMouseMove: function(e) {
			if (this.nowCapturingDrag) {
				this.sendDraggingSelectionPoint(e);
			}
			
			// this.blockMouseEventIfNeeded(e);
		},

		captureMouseUp: function(e) {
			if (this.nowCapturingDrag) {
				this.sendDraggingSelectionPoint(e);
				this.sendDraggingSelectionEnd();
			}
			
			this.blockMouseEventIfNeeded(e);
			this.nowCapturingDrag = false;
		},
		
		blockMouseEventIfNeeded: function(e) {
			if (this.pointingMode === PMODE_DRAG_SEL) {
				e.stopPropagation();
				e.preventDefault();
			}
		},
		
		sendFirstSelectionPoint: function(e) {
			if (this.pointingMode === PMODE_DRAG_SEL) {
				var pos = this.latLngFromClick(e);
				if (pos) {
					var sc = this.ownerApp.getSelectionController();
					sc.putSessionFirstPoint(pos.lat(), pos.lng());
				}
			}
		},
		
		sendDraggingSelectionPoint: function(e) {
			if (this.pointingMode === PMODE_DRAG_SEL) {
				var pos = this.latLngFromClick(e);
				if (pos) {
					var sc = this.ownerApp.getSelectionController();
					sc.putSessionDraggingPoint(pos.lat(), pos.lng());
				}
			}
		},
		
		sendDraggingSelectionEnd: function() {
			if (this.pointingMode === PMODE_DRAG_SEL) {
				var sc = this.ownerApp.getSelectionController();
				sc.commitDraggingSelection();
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
			
			if (sess.isRectangleFeedbackRecommended()) {
				this.updateSelectionFeedback(SEL_FEEDBACK_RECT, sess.getStartPos(), sess.getStartPos());
			}
		},
		
		selDidDisposeSession: function(selController) {
			this.leaveSpecialPointingMode();
		},
		
		selDidUpdateSession: function(selController, selSession) {
			if (selSession.isRectangleFeedbackRecommended()) {
				this.updateSelectionFeedback(SEL_FEEDBACK_RECT, selSession.getStartPos(), selSession.getEndPos());
			}
			
			if (selSession.isLineFeedbackRecommended()) {
				this.updateSelectionFeedback(SEL_FEEDBACK_LINE, selSession.getStartPos(), selSession.getEndPos());
			}
		},
		
		selWillCommitSession: function(selController, selSession) {
			this.clearSelectionFeedbackRect();
		},
		
		// Selection feedback views = = =
		
		setupSelectionViews: function() {
			this.setupSelectionPolygon();
			this.setupSelectionLine();
		},

		setupSelectionPolygon: function() {
			this.selectionPolygonpath = [];
			this.selectionPreviewPolygon = new google.maps.Polygon({
				strokeColor: "#0000dd",
				strokeOpacity: 0.8,
				strokeWeight: 0.5,
				fillColor: "#0000dd",
				fillOpacity: 0.3
			});

			this.selectionPreviewPolygon.setMap(this.gmap);
			this.selectionPreviewPolygon.setVisible(false);
		},
		
		setupSelectionLine: function() {
			this.selectionLinepath = [];
			this.selectionPreviewLine = new google.maps.Polyline({
				strokeColor: "#0000dd",
				strokeOpacity: 1,
				strokeWeight: 2
			});

			this.selectionPreviewLine.setMap(this.gmap);
			this.selectionPreviewLine.setVisible(false);
		},
		
		updateSelectionFeedback: function(feedbackType, location1, location2) {
			var pa;
			if (feedbackType === SEL_FEEDBACK_RECT) {
				pa = this.selectionPolygonpath;
				setRectPathVertices(pa, location1, location2);
				
				this.selectionPreviewPolygon.setPath(pa);
				this.selectionPreviewPolygon.setVisible(true);

				// XXX: Force redraw polygon
				this.onContainerResize();
			} else if (feedbackType === SEL_FEEDBACK_LINE) {
				pa = this.selectionLinepath;
				pa.length = 0;
				pa.push(new google.maps.LatLng( location1.lat, location1.lng ));
				pa.push(new google.maps.LatLng( location2.lat, location2.lng ));
				
				this.selectionPreviewLine.setPath(pa);
				this.selectionPreviewLine.setVisible(true);
				
				this.onContainerResize();
			}
		},
		
		clearSelectionFeedbackRect: function() {
			this.selectionPreviewPolygon.setVisible(false);
			this.selectionPreviewLine.setVisible(false);
		},
		
		// Utility functions
		elementX: function(e){ return e.pageX - this.jContainerElement.offset().left; },
		elementY: function(e){ return e.pageY - this.jContainerElement.offset().top;  },
		latLngFromClick: function(e) {
			if (!this.ownerApp) { return null; }
			var lc = this.ownerApp.getLayerController();
			var overlay = lc.getTopLayerOverlay();
			if (!overlay) { return null; }
			
			var sx = this.elementX(e);
			var sy = this.elementY(e);
			var pt = overlay.getProjection().fromContainerPixelToLatLng(new google.maps.Point(sx , sy));
			
			pt.screenX = sx;
			pt.screenY = sy;
			return pt;
		}
	};
	
	function setRectPathVertices(pa, location1, location2) {
		pa.length = 0;
		pa.push(new google.maps.LatLng( location1.lat, location1.lng ));
		pa.push(new google.maps.LatLng( location2.lat, location1.lng ));
		pa.push(new google.maps.LatLng( location2.lat, location2.lng ));
		pa.push(new google.maps.LatLng( location1.lat, location2.lng ));
	};

	// +++ Export +++
	aGlobal.mobmap.MapPane = MapPane;
})(window);