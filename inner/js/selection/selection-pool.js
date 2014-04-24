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
		
		removeId: function(objId) {
			if (this.idmap[objId]) {
				delete this.idmap[objId];
				this.fire();
			}
		},
		
		isAnySelected: function() {
			var m = this.idmap;
			for (var i in m) { return true; }
			
			return false;
		},
		
		isIDSelected: function(objId) {
			return !!( this.idmap[objId] );
		},
		
		count: function() {
			var m = this.idmap;
			var n = 0;
			
			for (var i in m) { ++n; }
			return n;
		},
		
		pushIDsToArray: function(outArray) {
			var m = this.idmap;
			for (var i in m) {
				outArray.push(i);
			}
		}
	};

	aGlobal.mobmap.SelectionPool = SelectionPool;
})(window);