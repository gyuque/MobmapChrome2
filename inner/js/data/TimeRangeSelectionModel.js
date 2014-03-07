if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var _pooledRange = new SelectedRange();
	
	function TimeRangeSelection() {
		this.element = createEventDummyElement();
		this.jElement = $(this.element);
		
		this.rangeList = [];
	}
	
	TimeRangeSelection.CHANGE_EVENT = "mm-timerange-selection-change";
	
	TimeRangeSelection.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		anySelected: function() {
			return this.rangeList.length > 0;
		}
	};


	function SelectedRange() {
		this.start = 0;
		this.end = 0;
	}
	
	aGlobal.mobmap.TimeRangeSelection = TimeRangeSelection;
})(window);