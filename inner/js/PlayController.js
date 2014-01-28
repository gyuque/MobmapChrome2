if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function PlayController(ownerApp) {
		this.tickAnimationClosure = this.tickAnimation.bind(this);
		this.ownerApp = ownerApp;
		this.playSpeed = 0;
		this.animationRunning = false;
		
		this.prevDrawTime = 0;
		this.prevShownDataTime = 0;
	}
	
	PlayController.prototype = {
		isPlaying: function() {
			return (this.playSpeed !== 0);
		},
		
		stop: function()     { this.setPlaySpeed(0); },
		play: function()     { this.setPlaySpeed(1); },
		playFast: function() { this.setPlaySpeed(5); },
		
		setPlaySpeed: function(s) {
			if (this.playSpeed !== s) {
				this.initTimerStatus();
			}

			this.playSpeed = s;
			this.runAnimation();
		},
		
		// ------------------------------
		initTimerStatus: function() {
			this.prevDrawTime = now_time();
			var dt = this.ownerApp.getCurrentProjectDateTime();
			
			this.prevShownDataTime = dt.getCurrentTime();
		},
		
		runAnimation: function() {
			if (this.animationRunning) {
				return;
			}
			
			this.animationRunning = true;
			this.tickAnimation();
		},
		
		tickAnimation: function() {
			var needContinue = false;
			var nextTime = 5;
			
			this.processAnimationFrame();
			
			if (needContinue) {
				setTimeout(this.tickAnimationClosure, nextTime);
			} else {
				console.log("ToDo: implement animation controller");
				this.animationRunning = false;
			}
		},
		
		processAnimationFrame: function() {
			var cur_t = now_time();
			var dt = cur_t - this.prevDrawTime;
			
			var realt_per_ms = 600 * 1000;
			var dDataTime = Math.floor(dt * realt_per_ms + 0.5);
			
			var endTime = this.getEndOfVisibleTimeline();
			console.log(dDataTime, endTime);
			
			this.prevDrawTime = cur_t;
		},
		
		getEndOfVisibleTimeline: function() {
			var tl = this.ownerApp.getTimelineBar();
			return tl.getViewportEnd();
		}
	};
	
	PlayController.PlayOption = function() {
		this.realSecPerPlayerSec = 600;
	};

	function now_time() {
		return (new Date()) - 0;
	}

	aGlobal.mobmap.PlayController = PlayController;
})(window);