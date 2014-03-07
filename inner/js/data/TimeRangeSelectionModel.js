if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var _pooledRange = new SelectedRange();
	
	function TimeRangeSelection() {
		this.element = createEventDummyElement();
		this.jElement = $(this.element);
		
		this.rangeList = [];
		this.floatingRange = new SelectedRange();
		this.hasFloating = false;
	}
	
	TimeRangeSelection.CHANGE_EVENT = "mm-timerange-selection-change";
	
	TimeRangeSelection.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		anySelected: function() {
			return this.rangeList.length > 0;
		},
		
		clear: function(suppress_event) {
			if (this.anySelected()) {
				this.rangeList.length = 0;

				if (!suppress_event) { this.fire(); }
			}
		},
		
		selectSingleRange: function(start, end) {
			this.clear(true);
			
			var r = _pooledRange;
			r.start = start;
			r.end = end;
			this.rangeList.push(r);
			
			this.fire();
		},
		
		fire: function() {
			this.eventDispatcher().trigger(TimeRangeSelection.CHANGE_EVENT, this);
		},
		
		newFloating: function() {
			this.floatingRange.start = -1;
			this.floatingRange.end = -1;
			this.hasFloating = true;
		}
	};


	function SelectedRange() {
		this.start = 0;
		this.end = 0;
	}
	
	aGlobal.mobmap.TimeRangeSelection = TimeRangeSelection;
})(window);