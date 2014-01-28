if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function PlayController(ownerApp) {
		this.tickAnimationClosure = this.tickAnimation.bind(this);
		this.ownerApp = ownerApp;
		this.playSpeed = 0;
		this.animationRunning = false;
		
		this.prevDrawTime = 0;
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
			
			this.prevDrawTime = cur_t;
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