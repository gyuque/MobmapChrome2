if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function PlayController(ownerApp) {
		this.tickAnimationClosure = this.tickAnimation.bind(this);
		this.ownerApp = ownerApp;
		this.playSpeed = 0;
		this.animationRunning = false;
	}
	
	PlayController.prototype = {
		isPlaying: function() {
			return (this.playSpeed !== 0);
		},
		
		stop: function()     { this.setPlaySpeed(0); },
		play: function()     { this.setPlaySpeed(1); },
		playFast: function() { this.setPlaySpeed(5); },
		
		setPlaySpeed: function(s) {
			this.playSpeed = s;
			this.runAnimation();
		},
		
		// ------------------------------
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
			
		}
	};

	aGlobal.mobmap.PlayController = PlayController;
})(window);