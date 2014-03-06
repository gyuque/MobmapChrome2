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
		},
		
		getCurrentTime: function() {
			return this.currentTime;
		},

		getCurrentTimeAsInt: function() {
			return this.currentTime | 0;
		},
		
		makeCurrentPrettyDate: function() {
			var d = new Date(this.currentTime * 1000.0);
			return d.getFullYear() + '-' + padding_02(d.getMonth()+1) + '-' + padding_02(d.getDate());
		},
		
		makeCurrentPrettyTime: function() {
			var d = new Date(this.currentTime * 1000.0);
			return padding_02(d.getHours()) +':' + padding_02(d.getMinutes()) +':' + padding_02(d.getSeconds());
		}
	};
	
	aGlobal.mobmap.DateTime = DateTime;
})(window);