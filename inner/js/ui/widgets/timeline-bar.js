if (!window.mobmap) { window.mobmap={}; }

(function(pkg) {
	'use strict';
	var TL_DEFAULT_HEIGHT = 40;
	var RE_HTML_TAG = /html/i ;
	var ZOOM_ANIMATION_DIVS = 13;
	
	function TimelineBar() {
		this.dragging = false;
		this.height = TL_DEFAULT_HEIGHT;
		this.width = 200;
		this.element = this.barCanvas = this.jElement = null;
		this.position = {
			detailCursor: 0
		};

		this.longSpanBar = new LongSpanBar(15, this);
		this.buttonZoomOut = null;
		this.buildElements();
		this.observeEvents();
		this.adjustStyle();
		this.setWidth(200);
		
		this.jDateDisplayElement = null;
		this.jTimeDisplayElement = null;
		this.boundData = null;
		
		this.zoomAnimationParams = {
			oldStart: 0,
			oldEnd: 0,
			newStart: 0,
			newEnd: 0,
			currentFrame: 0
		};
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
		
		setDateDisplayElement: function(el) {
			this.jDateDisplayElement = $(el);
			this.syncFromData();
		},
		
		setTimeDisplayElement: function(el) {
			this.jTimeDisplayElement = $(el);
			this.syncFromData();
		},
		
		// -----------------------------------
		buildElements: function() {
			this.element = $H('div', 'mm-timeline-bar-outer-box');
			this.barCanvas = $H('canvas', 'mm-timeline-bar-drag-area');
			this.jElement = $(this.element);
			this.jCanvas = $(this.barCanvas);
			this.g = this.barCanvas.getContext('2d');
			this.element.style.position = "relative";
			
			this.buttonZoomOut = new BarButton();
			this.buttonZoomOut.putOnRight(0);
			this.element.appendChild(this.barCanvas);
			this.element.appendChild(this.buttonZoomOut.element);
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
			
			this.syncFromData(true);
			this.redrawBar();
		},
		
		observeEvents: function() {
			this.jCanvas.
			 mousedown( this.onBarMouseDown.bind(this) ).
			 mousemove( this.onBarMouseMove.bind(this) ).
			 mouseup( this.onBarMouseUp.bind(this) ).
			 dblclick( this.onBarDoubleClick.bind(this) );
			
			$(document.body.parentNode).
			 mouseup( this.onGlobalMouseUp.bind(this) ).
			 mousemove( this.onGlobalMouseMove.bind(this) ).
			 mouseout( this.onGlobalMouseOut.bind(this) );
		},
		
		// Fetch date/time from model and update self
		syncFromData: function(suppressRedraw) {
			if (!this.boundData) {
				return;
			}
			
			var vStart = this.longSpanBar.viewportStartTime;
			var vEnd = this.longSpanBar.viewportEndTime;
			
			var t = this.boundData.currentTime;
			var vplen = vEnd - vStart;
			if (vplen === 0) {
				return;
			}
			
			var t_in_vp = (t - vStart) / vplen;
			
			var x = this.width * t_in_vp;
			this.position.detailCursor = Math.floor(x);
			if (!suppressRedraw) {
				this.redrawBar();
			}
			
			this.updateDisplayTexts();
		},
		
		updateDisplayTexts: function() {
			if (this.jDateDisplayElement && this.boundData) {
				var tx = this.boundData.makeCurrentPrettyDate();
				this.jDateDisplayElement.text(tx);
			}

			if (this.jTimeDisplayElement && this.boundData) {
				var time_tx = this.boundData.makeCurrentPrettyTime();
				this.jTimeDisplayElement.text(time_tx);
			}
		},
		
		onBarMouseDown: function(e) {
			this.dragging = true;
			var localX = this.calcLocalMouseX(e);
			this.changeByCursorX(localX);
		},
		
		onBarDoubleClick: function(e) {
			var localX = this.calcLocalMouseX(e);
			this.zoomViewport(localX);
		},

		onBarMouseMove: function(e) {
		},

		onBarMouseUp: function(e) {
			
		},
		
		onGlobalMouseUp: function(e) {
			this.dragging = false;
		},

		onGlobalMouseOut: function(e) {
			if (RE_HTML_TAG.test(e.target.tagName)) {
				this.dragging = false;
			}
		},
		
		onGlobalMouseMove: function(e) {
			if (this.dragging) {
				var localX = this.calcLocalMouseX(e); 
				this.changeByCursorX(localX);
			}
//			this.
		},
		
		calcLocalMouseX: function(e) {
			if (!e) { return -1; }
			
			var x = e.pageX - this.jCanvas.position().left - this.jElement.position().left;
			return x;
		},
		
		changeByCursorX: function(cx) {
			if (this.boundData) {
				this.boundData.setCurrentTime(this.calcDateTimeFromX(cx));
				this.syncFromData();
			}
		},
		
		calcDateTimeFromX: function(x) {
			var vStart = this.longSpanBar.viewportStartTime;
			var vEnd = this.longSpanBar.viewportEndTime;
			var vplen = vEnd - vStart;
			if (vplen === 0) { return 0; }

			var normalizedX = x / this.width;
			var t = vplen * normalizedX + vStart;
			return Math.floor(t);
		},
		
		zoomViewport: function(centerX) {
			if (this.zoomAnimationParams.currentFrame) {
				return;
			}
			
			var centerT = this.calcDateTimeFromX(centerX);
			var centerTRatio = centerX / this.width;

			var vStart = this.longSpanBar.viewportStartTime;
			var vEnd = this.longSpanBar.viewportEndTime;
			var vplen = vEnd - vStart;
			var newLen = vplen * 0.5;
			var exLen = vplen * 0.25;

			var newStart = Math.floor(centerT - newLen * centerTRatio);
			var newEnd   = Math.floor(centerT + newLen * (1.0 - centerTRatio));
			
			// Set params
			this.zoomAnimationParams.oldStart = vStart;
			this.zoomAnimationParams.oldEnd = vEnd;
			this.zoomAnimationParams.newStart = newStart;
			this.zoomAnimationParams.newEnd = newEnd;
			
			this.zoomAnimationParams.currentFrame = 0;
			this.tickZoomAnimation();
		},
		
		tickZoomAnimation: function() {
			var t = (this.zoomAnimationParams.currentFrame + 1) / ZOOM_ANIMATION_DIVS;
//			console.log(this.zoomAnimationParams.currentFrame, t, tweenZoomT(t))
			if (t > 0.999) {t=1;}
			this.applyZoomAnimation( tweenZoomT(t) );
			
			if (++this.zoomAnimationParams.currentFrame >= ZOOM_ANIMATION_DIVS) {
				// finish
				this.zoomAnimationParams.currentFrame = 0;
			} else {
				setTimeout(this.tickZoomAnimation.bind(this), 15);
			}
		},
		
		applyZoomAnimation: function(t) {
			var _t = 1.0 - t;
			var mid_start = this.zoomAnimationParams.oldStart * _t +
			                this.zoomAnimationParams.newStart * t;
			var mid_end   = this.zoomAnimationParams.oldEnd   * _t +
			                this.zoomAnimationParams.newEnd   * t;
			
			this.longSpanBar.setViewportStart(mid_start, true);
			this.longSpanBar.setViewportEnd(mid_end);
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
		},
		
		longtimeAfterViewportChange: function() {
			this.syncFromData();
		}
	};
	
	function LongSpanBar(height, owner) {
		this.owner = owner;
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
					this.owner.longtimeAfterViewportChange();
				return true;
			}
			
			return false;
		},
		
		setViewportStart: function(t, suppress_notify) {
			if (t !== this.viewportStartTime) {
				this.viewportStartTime = t;
				this.cacheInvalid = true;
				if (!suppress_notify) {
					this.owner.longtimeAfterViewportChange();
				}
			}
		},

		setViewportEnd: function(t, suppress_notify) {
			if (t !== this.viewportEndTime) {
				this.viewportEndTime = t;
				this.cacheInvalid = true;
				if (!suppress_notify) {
					this.owner.longtimeAfterViewportChange();
				}
				
				if (this.viewportStartTime > this.viewportEndTime) {
					console.log("WARNING: reversed start-end");
				}
			}
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
			var yearScaleMode = this.widthPerDay < 24;
			
			var w = this.width;
			if (w < 1) {return;}
			
			var q_w = w >> 2;
			var old_y = -1, old_mon = -1, old_day = -1, old_hr = -1;
			
			for (var x = -q_w;x < w;++x) {
				var ratio = x/w;
				var t = this.viewportStartTime*(1 - ratio) + this.viewportEndTime*ratio;
				
				var tDate = new Date(t * 1000.0);
				var year = tDate.getFullYear();
				var mon  = tDate.getMonth();
				var mday = tDate.getDate();
				var hr   = tDate.getHours();
				
				if (yearScaleMode) {
					if (old_y !== year || old_mon !== mon) {
						old_y = year;
						old_mon = mon;
						old_day = mday;
						
						if (x >= 0) {
							this.drawDateLabelBar(g, x);
						}
						this.drawMonLabelText(g, x, tDate);
					}
				} else {
					if (old_y !== year || old_mon !== mon || old_day !== mday) {
						old_y = year;
						old_mon = mon;
						old_day = mday;
					
						if (x >= 0) {
							this.drawDateLabelBar(g, x);
						}
						this.drawDateLabelText(g, x, tDate);
					}
				}

				if (this.widthPerDay > 96 && old_hr != hr) {
					old_hr = hr;
					if (hr != 0 && x >= 0) {
						this.drawHourGuage(g, x, hr);
					}
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
		
		drawHourGuage: function(g, x, hour) {
			var h = (hour === 12) ? 3 : 1;
			g.save();
			g.fillStyle = 'rgba(0,0,0,0.6)';
			g.fillRect(x-1, this.height-h, 1, h);
			g.fillStyle = 'rgba(255,255,255,0.4)';
			g.fillRect(x  , this.height-h, 1, h);
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
		
		drawMonLabelText: function(g, x, date) {
			g.save();
			var mon = date.getMonth();
			var year = date.getFullYear();
			var mname = kDefaultShortMonthNames[mon] +'. ';

			for (var i = 0;i < 2;++i) {
				g.font = 'normal bold 12px sans-serif';
				g.fillStyle = (i === 0) ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.6)';
				g.fillText(mname, x+4, 13 +1-i);
				var textMet = g.measureText(mname);

				g.font = 'normal normal 8px sans-serif';
				g.fillText(year, x+4+textMet.width, 13 +1-i);
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
	
	// -----------------------------
	// On-Bar Button
	function BarButton() {
		this.width = 17;
		this.height = 16;
		this.element = document.createElement('canvas');
		this.prepareBackgroundImage();
	}
	
	BarButton.prototype = {
		prepareBackgroundImage: function() {
			var w = this.width;
			var h = this.height;
			var g = this.element.getContext('2d');
			
			this.element.width = w;
			this.element.height = h;
			this.drawButtonBackground(g, 0, 0);
			this.drawForeground(g, 0, 0);
		},
		
		drawButtonBackground: function(g, x, y) {
			var grad = g.createLinearGradient(0, 0, 0, this.height);
			grad.addColorStop(0  , '#eee');
			grad.addColorStop(0.1, '#aaa');
			grad.addColorStop(  1, '#777');
			
			g.save();
			g.translate(x, y);
			
			g.fillStyle = grad;
			g.fillRect(0, 0, this.width, this.height);
			g.fillStyle = "rgba(0,0,0,0.3)";
			g.fillRect(0, 0, this.width, this.height);
			g.fillStyle = grad;
			g.fillRect(1, 1, this.width-2, this.height-2);
			
			g.restore();
		},
		
		drawForeground: function(g, x, y) {
			var offsetY;
			for (var i = 0;i < 3;++i) {
				g.save();
				
				switch(i) {
				case 0: offsetY=-1; g.fillStyle='rgba(0,0,0,0.3)'; break;
				case 1: offsetY= 1; g.fillStyle='rgba(255,255,255,0.3)'; break;
				case 2: offsetY= 0; g.fillStyle='#fff'; break;
				}
				
				g.translate(x, y + offsetY);
				this.drawUpSymbol(g);
				g.restore();
			}
		},
		
		drawUpSymbol: function(g) {
			g.fillRect(3,3,7,2);
		},
		
		putOnRight: function(x) {
			var s = this.element.style;
			s.position = 'absolute';
			s.right = x + "px";
			s.top = '0';
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
	
	function tweenZoomT(t) {
		if (t < 0) {return 0;}
		if (t > 1) {return 1;}
		
		return Math.sin((t-0.5) * Math.PI) * 0.5 + 0.5;
		//return Math.sin(t * Math.PI * 0.5);
	}
	
	pkg.TimelineBar = TimelineBar;
})(window.mobmap);