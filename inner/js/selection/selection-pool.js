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
		
		clear: function() {
			var m = this.idmap;
			for (var i in m) {
				delete m[i];
			}
		},
		
		addId: function(objId) {
			this.idmap[objId] = true;
		}
	};

	aGlobal.mobmap.SelectionPool = SelectionPool;
})(window);