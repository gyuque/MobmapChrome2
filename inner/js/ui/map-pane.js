if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var DARKMAP_ID = 'dark';
	var OSMAP_ID = 'osm';
	var TONERMAP_ID = 'toner';

	var PMODE_DEFAULT  = 0;
	var PMODE_DRAG_SEL = 1;
	var PMODE_CLICK_SEL = 2;
	
	var SEL_FEEDBACK_RECT = 0;
	var SEL_FEEDBACK_LINE = 1;

	function MapPane(containerElement) {
		this.gmap = null;
		this.ownerApp = null;
		this.darkMapType = null;
		this.osmMapType  = null;
		this.tonerMapType  = null;
		this.pointingMode = PMODE_DEFAULT;
		this.nowCapturingDrag = false;
		this.prevRenderTargetTime = -1;
		this.annotatedPinList = [];

		// Preview overlays
		this.aimingMarker = null;
		this.selectionPolygonpath    = null;
		this.selectionPreviewPolygon = null;
		this.selectionLinepath    = null;
		this.selectionPreviewLine = null;
		this.gateUI = null;

		this.initialLocation = {
			zoom: 8,
			lat: 36.7,
			lng: 138.7
		};
		// ----------------------------------------------------------
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		this.outerOverlay = null;
		
		this.setupGoogleMaps();
		this.setupCaptureEvents();
		this.setupAimingMarker();
		this.setupSelectionViews();
		this.setupOuterOverlay();
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
		
		setClockVisibility: function(v) {
			if (this.outerOverlay && this.outerOverlay.setVisibility(v)) {
				this.outerOverlay.redrawWithProject(this.ownerApp.getCurrentProject());
			}
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
			this.setupOpenStreetMap(this.gmap, "OSM");
			this.setupTonerMap(this.gmap, "Stamen toner");
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
		
		setupOpenStreetMap: function(gmap, typeName) {
			if (this.osmMapType) {return;}
			
			var mt = createOSMImageMapType(false);
			gmap.mapTypes.set(OSMAP_ID, mt);
			this.osmMapType = mt;
		},

		setupTonerMap: function(gmap, typeName) {
			if (this.tonerMapType) {return;}
			
			var mt = createOSMImageMapType(true);
			gmap.mapTypes.set(TONERMAP_ID, mt);
			this.tonerMapType = mt;
		},
		
		generateDefaultMapTypeList: function() {
			return [
				google.maps.MapTypeId.HYBRID,
				google.maps.MapTypeId.ROADMAP,
				google.maps.MapTypeId.SATELLITE,
				google.maps.MapTypeId.TERRAIN,
				DARKMAP_ID,
				OSMAP_ID,
				TONERMAP_ID
			];
		},
		
		setupOuterOverlay: function() {
			this.outerOverlay = new OuterMapClockOverlay();
			this.containerElement.appendChild(this.outerOverlay.element);
		},

		onCurrentDateTimeChange: function(e, sender) {
			this.hideAimingMarker();
			if (this.outerOverlay && this.outerOverlay.visible) {
				this.outerOverlay.redrawWithProject(this.ownerApp.getCurrentProject());
			}
			
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

		enterClickSelectionMode: function() {
			this.pointingMode = PMODE_CLICK_SEL;
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
				j.addClass('on-selection').removeClass('on-click-selection');
			} else if (this.pointingMode === PMODE_CLICK_SEL) {
				j.addClass('on-click-selection').removeClass('on-selection');
			} else {
				j.removeClass('on-selection').removeClass('on-click-selection');
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
			} else if (this.pointingMode === PMODE_CLICK_SEL) {
				var pos = this.latLngFromClick(e);
				if (pos) {
					var sc = this.ownerApp.getSelectionController();
					sc.putSessionClickPoint(pos.lat(), pos.lng());
					sc.commitClickingSelection();
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
				
				var clk_mode = sess.isClickingSelectionRecommended();
				if (clk_mode) {
					this.enterClickSelectionMode();
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
		
		selDidGateProcess: function(selController) {
			this.ownerApp.closeGateBusyDialog();
		},
		
		
		// Aiming marker
		
		setupAimingMarker: function() {
			var marker = new google.maps.Marker({
				map: this.gmap,
				clickable: false,
				icon: {
					url: 'images/aiming.png',
					anchor: new google.maps.Point(16, 16)
				}
			});
			
			marker.setVisible(false);
			this.aimingMarker = marker;
		},
		
		showAimingMarker: function(lat, lng) {
			this.aimingMarker.setPosition(new google.maps.LatLng(lat, lng));
			this.aimingMarker.setVisible(true);
		},

		hideAimingMarker: function() {
			this.aimingMarker.setVisible(false);
		},
		
		// Selection feedback views = = =
		
		setupSelectionViews: function() {
			this.setupSelectionPolygon();
			this.setupSelectionLine();
			this.gateUI = new mobmap.MapGateUI(this.gmap, this);
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
		
		putGate: function(end1, end2) {
			if (mobmap.MapGateUI.isEndsValid(end1, end2)) {
				this.gateUI.resetDirection();
				this.gateUI.setEnds(end1, end2);
				this.gateUI.show();
			}
		},
		
		clearGate: function() {
			this.gateUI.hide();
		},
		
		gateuiOnOK: function(sourceGateUI) {
			var e1  = sourceGateUI.getStartLocation();
			var e2  = sourceGateUI.getEndLocation();
			var dir = sourceGateUI.getGateDirection();
			var expression = sourceGateUI.getConditionExpression();
			var expressionObject = null;
			
			if (!!expression) {
				expressionObject = new mobmap.ExpressionQuery();
				expressionObject.parse(expression);

				if (expressionObject.hasError || !(expressionObject.rootNode)) {
					sourceGateUI.showExpressionError();
					return;
					// abort
				}
			}
			
			this.ownerApp.showGateBusyDialog();
			
			this.
			 ownerApp.
			 getSelectionController().
			 runGateSelection(e1.lat(), e1.lng(), e2.lat(), e2.lng(), dir, expressionObject);
		},

		gateuiOnAdd: function(sourceGateUI) {
			var e1  = sourceGateUI.getStartLocation();
			var e2  = sourceGateUI.getEndLocation();
			var dir = sourceGateUI.getGateDirection();
			var cond = sourceGateUI.getConditionExpression();
			this.ownerApp.addAnnotatedGate(e1.lat(), e1.lng(), e2.lat(), e2.lng(), dir, cond);
			this.ownerApp.revealAnnotationView();
		},
		
		moveToGate: function() {
			var g = this.gateUI;
			var p1 = g.getStartLocation();
			var p2 = g.getEndLocation();
			if (!p1 || !p2) {
				return;
			}
			
			var lat_p = Math.max(p1.lat(),p2.lat()) - Math.min(p1.lat(),p2.lat());
			var lng_p = Math.max(p1.lng(),p2.lng()) - Math.min(p1.lng(),p2.lng());
			
			var sw = new google.maps.LatLng( Math.min(p1.lat(),p2.lat())-lat_p , Math.min(p1.lng(),p2.lng())-lng_p );
			var ne = new google.maps.LatLng( Math.max(p1.lat(),p2.lat())+lat_p , Math.max(p1.lng(),p2.lng())+lng_p );

			this.gmap.panToBounds( new google.maps.LatLngBounds(sw, ne) );
		},
		
		// Annotated location pins
		createAnnotatedLocationPin: function(lat, lng) {
			var mk = new google.maps.Marker({
				icon: 'images/small-map-marker.png',
				position: new google.maps.LatLng(lat, lng),
				map: this.gmap,
				draggable: true
			});
			
			return mk;
		},
		
		toggleAnnotatedLocationPin: function(locationAnnotation) {
			var mk = this.findAnnotatedLocationPin(locationAnnotation.id);
			var need_pan = false;
			if (!mk) {
				var coord = locationAnnotation.coordinate;
				mk = this.createAnnotatedLocationPin(coord.lat, coord.lng);
				mk.mmAnnotationId = locationAnnotation.id;
				this.annotatedPinList.push(mk);

				google.maps.event.addListener(mk, 'dragend', this.onAnnotatedLocationPinDragEnd.bind(this, mk));
				this.observeLocationAnnotation(locationAnnotation);
				need_pan = true;
			} else {
				var v = !mk.getVisible();
				mk.setVisible(v);
				need_pan = v;
			}
			
			if (need_pan) {
				this.gmap.panTo(mk.getPosition());
			}
		},
		
		observeLocationAnnotation: function(locationAnnotation) {
			locationAnnotation.eventDispatcher().bind(mobmap.MMAnnotationEvent.WILL_REMOVE, this.onAnnotationWillRemove.bind(this));
		},

		onAnnotationWillRemove: function(e, locationAnnotation) {
			var marker = this.findAnnotatedLocationPin(locationAnnotation.id);
			if (marker) {
				this.removeLocationAnnotationMarker(marker);
			}
		},
		
		removeLocationAnnotationMarker: function(mk) {
			mk.setMap(null);
			
			var index = this.annotatedPinList.indexOf(mk);
			if (index >= 0) {
				this.annotatedPinList.splice(index, 1);
			}
		},

		onAnnotatedLocationPinDragEnd: function(marker, e) {
			var ll = marker.getPosition();
			this.ownerApp.changeAnnotatedLocationCoordinate(marker.mmAnnotationId, ll.lat(), ll.lng());
		},

		findAnnotatedLocationPin: function(aid) {
			var ls = this.annotatedPinList;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var mk = ls[i];
				if (mk.mmAnnotationId === aid) {
					return mk;
				}
			}
			
			return null;
		},
		
		getViewportInfo: function() {
			var gmap = this.getGoogleMaps();
			if (!gmap) {return null;}
			
			var c = gmap.getCenter();
			return {
				center: {
					lat: c.lat(),
					lng: c.lng()
				},
				zoom: gmap.getZoom()
			};
		} ,
		
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

	// OSM tile provider
	function createOSMImageMapType(toner) {
		var base = toner ? "tile.stamen.com/toner" : "tile.openstreetmap.org";
		var name = toner ? "Stamen toner"          : "OSM";
		
		var options = {
			getTileUrl: function(coord, zoom) {
				return "http://" +base+ "/" +zoom+ "/" +coord.x+ "/" +coord.y+ ".png";
			},
			tileSize: new google.maps.Size(256, 256),
			maxZoom: 19,
			minZoom: 0,
			name: name
		};
		
		return new google.maps.ImageMapType(options);
	}
	
	// Outer-map overlay
	function OuterMapClockOverlay() {
		this.clockSize = {
			width: 140,
			height: 176
		};
		
		this.renderer = new mobmap.ClockRenderer(this.clockSize.width, this.clockSize.height);
		
		this.element = document.createElement('canvas');
		this.configureCanvasSize(this.clockSize);
		this.configureStyle(this.element.style);
		this.g = this.element.getContext('2d');
		
		this.setDate( new Date("1970-01-01 00:00:00") );
		this.clear();
		this.renderer.render(this.g);

		this.visible = true;
		this.setVisibility(false);
	}
	
	OuterMapClockOverlay.prototype = {
		setVisibility: function(b) {
			if (this.visible !== b) {
				this.visible = b;
				this.element.style.display = b ? '' : 'none';
				return true;
			}
			
			return false;
		},
		
		redrawWithProject: function(prj) {
			if (!prj) { return; }
			
			var t = prj.currentDateTime.getCurrentTime();
			this.redrawWithTime(t);
		},
		
		clear: function() {
			this.g.clearRect(0, 0, this.element.width - 0, this.element.height - 0);
		},
		
		redrawWithTime: function(ut) {
			var d = new Date(ut * 1000.0);
			this.setDate(d);

			this.clear();
			this.renderer.render(this.g);
		},
		
		setDate: function(d) {
			var hr = d.getHours();
			var mn = d.getMinutes();
			var sc = d.getSeconds();

			this.renderer.hour = hr;
			this.renderer.min  = mn;
			this.renderer.sec  = sc;
			this.renderer.makeTopLabelFromDate(d);
		},
		
		configureCanvasSize: function(size) {
			this.element.width = size.width;
			this.element.height = size.height;
		},
		
		configureStyle: function(s) {
			s.position = "absolute";
			s.bottom = "20px";
			s.right = "8px";
			s.zIndex = 999;
		}
	};
	
	// +++ Export +++
	aGlobal.mobmap.MapPane = MapPane;
})(window);