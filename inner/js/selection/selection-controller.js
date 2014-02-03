if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function SelectionController(ownerApp) {
		this.ownerApp = ownerApp;
	}
	
	SelectionController.prototype = {
		
	};

	aGlobal.mobmap.SelectionController = SelectionController;
})(window);