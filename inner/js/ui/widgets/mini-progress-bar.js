if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var BAR_H = 3;
	
	function MiniProgressBar(width) {
		this.width = width || 48;
		this.element = document.createElement("div");
		this.element.style.height = BAR_H + "px";
		this.element.setAttribute('class', 'mm-mini-progress-bar');
		this.setRatio(0);
	}
	
	MiniProgressBar.prototype = {
		setRatio: function(r) {
			var barW = Math.floor(this.width * r);
			var restW = this.width - barW;
			
			var s = this.element.style;
			s.width = restW + "px";
			s.borderLeftWidth = barW + "px";
		}
	};
	
	aGlobal.mobmap.MiniProgressBar = MiniProgressBar;
})(window);