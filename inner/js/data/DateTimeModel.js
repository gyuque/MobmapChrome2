if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function DateTime() {
		this.element = createEventDummyElement();
		this.jElement = $(this.element);
		
		this.currentTime = 0;
	}
	
	DateTime.CURRENT_TIME_CHANGE_EVENT = "mm-datetime-current-time-change";
	
	DateTime.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		setCurrentTime: function(t, suppress_event) {
			if (this.currentTime !== t) {
				this.currentTime = t;
				if (!suppress_event) {
					this.fire();
				}
			}
		},
		
		fire: function() {
			this.eventDispatcher().trigger(DateTime.CURRENT_TIME_CHANGE_EVENT, this);
		},
		
		shiftTime: function(dSec) {
			this.setCurrentTime( this.currentTime + dSec );
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