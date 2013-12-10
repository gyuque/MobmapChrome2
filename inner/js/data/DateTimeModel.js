if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function DateTime() {
		this.element = document.createElement('span');
		this.jElement = $(this.element);
		
		this.currentTime = 0;
		this.primaryRange = null;
		
		this.pooledRange = {start:0, end:0};
	}
	
	DateTime.CURRENT_TIME_CHANGE_EVENT = "mm-datetime-current-time-change";
	
	DateTime.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		setCurrentTime: function(t) {
			if (this.currentTime !== t) {
				this.currentTime = t;
				this.eventDispatcher().trigger(DateTime.CURRENT_TIME_CHANGE_EVENT, this);
			}
		}
	};
	
	aGlobal.mobmap.DateTime = DateTime;
})(window);