if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function SelectionPool() {
		var eve = document.createElement('span');
		this.jEventElement = $(eve);
		
		this.idmap = createCleanHash();
	}
	
	SelectionPool.CHANGE_EVENT = "selection-pool-change";
	
	SelectionPool.prototype = {
		eventDispatcher: function() {
			return this.jEventElement;
		},
		
		fire: function() {
			this.eventDispatcher().trigger(SelectionPool.CHANGE_EVENT, this);
		},
		
		clear: function(suppress_event) {
			var m = this.idmap;
			for (var i in m) {
				delete m[i];
			}

			if (!suppress_event) { this.fire(); }
		},
		
		addId: function(objId, suppress_event) {
			this.idmap[objId] = true;
			
			if (!suppress_event) { this.fire(); }
		},
		
		isAnySelected: function() {
			var m = this.idmap;
			for (var i in m) { return true; }
			
			return false;
		},
		
		isIDSelected: function(objId) {
			return !!( this.idmap[objId] );
		}
	};

	aGlobal.mobmap.SelectionPool = SelectionPool;
})(window);