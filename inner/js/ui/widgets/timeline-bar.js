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
		
		this.boundData = null;
	}
	
	TimelineBar.prototype = {
		// APIs
		eventDispatcher: function() {
			return this.jElement;
		},
		
		setTimeRange: function(startTime, endTime) {
			this.longSpanBar.setTimeRange(startTime, endTime);
			this.redrawBar();
		},
		
		bindDateTime: function(d) {
			this.boundData = d;
			this.syncFromData();
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
		
		// Fetch date/time from model and update self
		syncFromData: function() {
			
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
			this.longSpanBar.render(this.g, 0);
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
		this.widthPerDay = 100;
		
		this.viewportStartTime = 0;
		this.viewportEndTime = 0;

		this.cacheInvalid = true;
		this.cachedCanvas = document.createElement('canvas');
		this.g = this.cachedCanvas.getContext('2d');
		
		this.backgroundGradient = this.makeBackgroundGradient(this.g);
	}
	
	LongSpanBar.prototype = {
		render: function(targetContext, destY) {
			if (this.cacheInvalid) {
				this.updateCache();
			}
			
			targetContext.drawImage(this.cachedCanvas, 0, destY);
		},
		
		setWidth: function(w) {
			if (w !== this.width) {
				this.width = w;
				this.adjustCacheCanvasSize();
				this.cacheInvalid = true;
			}
		},
		
		adjustCacheCanvasSize: function() {
			this.cachedCanvas.width = Math.floor(this.width);
		},
		
		setTimeRange: function(st, ed) {
			if (this.startTime !== st || this.endTime !== ed) {
				this.startTime = st;
				this.endTime = ed;
				this.cacheInvalid = true;
			}
		},
		
		fullViewport: function() {
			if (this.startTime !== this.viewportStartTime || 
				this.endTime !== this.viewportEndTime) {
					this.viewportStartTime = this.startTime;
					this.viewportEndTime = this.endTime;
					
					this.cacheInvalid = true;
				return true;
			}
			
			return false;
		},
		
		updateCache: function() {
			this.widthPerDay = this.calcWidthPerDay();
			
			this.drawBackground();
			this.drawDateLabels(this.g);
			this.cacheInvalid = false;
		},
		
		calcWidthPerDay: function() {
			var tlen = this.viewportEndTime - this.viewportStartTime;
			var hours = tlen / 3600.0;
			if (hours < 1) { hours = 1; }
			
			var w = this.width * 24 / hours;
			return w;
		},
		
		drawBackground: function() {
			var g = this.g;
			g.fillStyle = "#aaa";
			g.fillRect(0, 0, this.width, this.height);
			g.fillStyle = this.backgroundGradient;
			g.fillRect(1, 1, this.width-2, this.height-2);
		},
		
		drawDateLabels: function(g) {
			var w = this.width;
			if (w < 1) {return;}
			
			var old_y = -1, old_mon = -1, old_day = -1;
			
			for (var x = 0;x < w;++x) {
				var ratio = x/w;
				var t = this.viewportStartTime*(1 - ratio) + this.viewportEndTime*ratio;
				
				var tDate = new Date(t * 1000.0);
				var year = tDate.getFullYear();
				var mon  = tDate.getMonth();
				var mday = tDate.getDate();
				
				if (old_y != year || old_mon != mon || old_day != mday) {
					old_y = year;
					old_mon = mon;
					old_day = mday;
					
					this.drawDateLabelBar(g, x);
					this.drawDateLabelText(g, x, tDate);
					//console.log(tDate)
				}
			}
		},
		
		drawDateLabelBar: function(g, x) {
			g.save();
			g.fillStyle = 'rgba(0,0,0,0.4)';
			g.fillRect(x-1, 1, 1, this.height - 2);
			g.fillStyle = 'rgba(255,255,255,0.4)';
			g.fillRect(x, 1, 1, this.height - 1);
			g.restore();
		},
		
		drawDateLabelText: function(g, x, date) {
			g.save();

			var mday = date.getDate();
			var wday = date.getDay();

			for (var i = 0;i < 2;++i) {
				if (i === 0) {
					g.fillStyle = 'rgba(255,255,255,0.4)';
				} else {
					g.fillStyle = 'rgba(' +makeWdayColor(wday)+ ',0.6)';
				}
				
				g.font = 'normal bold 12px sans-serif';
				g.fillText(mday, x+4, 13 +1-i);
				var textMet = g.measureText(mday);
				
				var wdname = kDefaultDayNames[wday];
				if (this.widthPerDay > 48) {
					g.font = 'normal bold 8px sans-serif';
					g.fillText(wdname, x+6+textMet.width, 13 +1-i);
				}
			}
			
			g.restore();
		},
		
		makeBackgroundGradient: function(g) {
			var grad  = g.createLinearGradient(0,0, 0,this.height);
			grad.addColorStop(0  ,'#eee');
			grad.addColorStop(0.1,'#ddd');
			grad.addColorStop(0.7,'#bbb');
			grad.addColorStop(1  ,'#999');
			return grad;
		}
	};
	
	function makeWdayColor(wd) {
		if (wd === 0) {
			return '180,30,20';
		} else if (wd === 6) {
			return '20,30,160';
		}
		
		return '0,0,0';
	}
	
	pkg.TimelineBar = TimelineBar;
})(window.mobmap);