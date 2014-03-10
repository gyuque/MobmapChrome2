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
	TimeRangeSelection.FLOATING_CHANGE_EVENT = "mm-timerange-floating-selection-change";
	
	TimeRangeSelection.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		anySelected: function() {
			return this.rangeList.length > 0;
		},
		
		getFirstSelection: function() {
			return this.rangeList[0] || null;
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
		},
		
		setFloatingStart: function(seconds) {
			this.floatingRange.start = seconds;
		},
		
		setFloatingEnd: function(seconds) {
			this.floatingRange.end = seconds;
			this.eventDispatcher().trigger(TimeRangeSelection.FLOATING_CHANGE_EVENT, this);
		},
		
		isRangeValid: function() {
		},
		
		isFloatingValid: function() {
			if (!this.hasFloating) { return false; }

			var r = this.floatingRange;
			return r.start >= 0 && r.end >= 0;
		},
		
		commitFloating: function() {
			this.correctFloatingTimeOrder();
			this.hasFloating = false;
			
			var r = this.floatingRange;
			this.selectSingleRange( r.start, r.end );

			this.eventDispatcher().trigger(TimeRangeSelection.FLOATING_CHANGE_EVENT, this);
		},
		
		correctFloatingTimeOrder: function() {
			var r = this.floatingRange;
			var t1 = r.start;
			var t2 = r.end;
			
			r.start = Math.min(t1, t2);
			r.end = Math.max(t1, t2);
		}
	};


	function SelectedRange() {
		this.start = 0;
		this.end = 0;
	}
	
	aGlobal.mobmap.TimeRangeSelection = TimeRangeSelection;
})(window);