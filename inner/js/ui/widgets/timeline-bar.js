if (!window.mobmap) { window.mobmap={}; }

(function(pkg) {
	'use strict';
	var TL_DEFAULT_HEIGHT = 40;
	
	function TimelineBar() {
		this.dragging = false;
		this.height = TL_DEFAULT_HEIGHT;
		this.width = 200;
		this.element = this.barCanvas = this.jElement = null;
		this.position = {
			detailCursor: 0
		};

		this.longSpanBar = new LongSpanBar(15);
		this.buildElements();
		this.observeEvents();
		this.adjustStyle();
		this.setWidth(200);
	}
	
	TimelineBar.prototype = {
		// APIs
		eventDispatcher: function() {
			return this.jElement;
		},
		
		setTimeRange: function(startTime, endTime) {
			this.longSpanBar.setTimeRange(startTime, endTime);
		},
		
		// -----------------------------------
		buildElements: function() {
			this.element = $H('div', 'mm-timeline-bar-outer-box');
			this.barCanvas = $H('canvas', 'mm-timeline-bar-drag-area');
			this.jElement = $(this.element);
			this.jCanvas = $(this.barCanvas);
			this.g = this.barCanvas.getContext('2d');
			
			this.element.appendChild(this.barCanvas);
		},
		
		adjustStyle: function() {
			var h_px = Math.floor(this.height) + "px";

			var s = this.element.style;
			s.height = h_px;
			
			this.barCanvas.height = Math.floor(this.height);
			this.barCanvas.style.backgroundColor = "#cdf";
		},
		
		setWidth: function(w) {
			w = Math.floor(w);
			this.width = w;
			this.barCanvas.width = w;
			this.longSpanBar.setWidth(w);
			
			this.redrawBar();
		},
		
		observeEvents: function() {
			this.jCanvas.
			 mousedown( this.onBarMouseDown.bind(this) ).
			 mousemove( this.onBarMouseMove.bind(this) ).
			 mouseup( this.onBarMouseUp.bind(this) );
			
			$(document.body).
			 mouseup( this.onGlobalMouseUp.bind(this) ).
			 mouseout( this.onGlobalMouseOut.bind(this) );
		},
		
		onBarMouseDown: function(e) {
			this.dragging = true;
			var localX = this.calcLocalMouseX(e);
			this.changeByCursorX(localX);
		},

		onBarMouseMove: function(e) {
			if (this.dragging) {
				var localX = this.calcLocalMouseX(e); 
				this.changeByCursorX(localX);
			}
		},

		onBarMouseUp: function(e) {
			
		},
		
		onGlobalMouseUp: function(e) {
			this.dragging = false;
		},

		onGlobalMouseOut: function(e) {
			this.dragging = false;
		},
		
		calcLocalMouseX: function(e) {
			if (!e) { return -1; }
			
			var x = e.pageX - this.jCanvas.position().left;
			return x;
		},
		
		changeByCursorX: function(cx) {
			this.position.detailCursor = Math.floor(cx);
			this.redrawBar();
		},
		
		redrawBar: function() {
			this.renderDetailView(15);
			this.drawDetailCursor(15);
		},
		
		drawDetailCursor: function(y) {
			var h = 25;
			var g = this.g;
			var x = this.position.detailCursor;
			
			g.save();

			g.globalAlpha = 0.7;
			g.fillStyle = "#000";
			g.fillRect(x-1,y+1, 3,h-2)

			g.fillStyle = "#fff";
			g.fillRect(x,y+1, 1,h-2)

			g.restore();
		},
		
		renderDetailView: function(y) {
			var h = 25;
			var w = this.width;
			var g = this.g;
			
			g.save();
			
			g.fillStyle = "#aaa";
			g.fillRect(0,y,w,h);

			g.fillStyle = "#111";
			g.fillRect(0,y+1, w,h-2);

			g.fillStyle = "#222";
			g.fillRect(0,y+2, w,h-3);

			g.fillStyle = "#333";
			g.fillRect(0,y+2, w,h-4);
			
			g.restore();
		}
	};
	
	function LongSpanBar(height) {
		this.height = height;
		this.width = -1;
		this.startTime = 0;
		this.endTime = 0;

		this.cacheInvalid = true;
		this.cachedCanvas = document.createElement('canvas');
		this.g = this.cachedCanvas.getContext('2d');
	}
	
	LongSpanBar.prototype = {
		render: function(targetContext) {
			if (this.cacheInvalid) {
				this.updateCache();
			}
		},
		
		setWidth: function(w) {
			if (w !== this.width) {
				this.width = w;
				this.cacheInvalid = true;
			}
		},
		
		setTimeRange: function(st, ed) {
			if (this.startTime !== st || this.endTime !== ed) {
				this.startTime = st;
				this.endTime = ed;
				this.cacheInvalid = true;
			}
		},
		
		updateCache: function() {
			
		},
		
		drawBackground: function() {
			var g = this.g;
		}
	};
	
	pkg.TimelineBar = TimelineBar;
})(window.mobmap);