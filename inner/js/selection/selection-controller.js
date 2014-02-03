if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function SelectionController(ownerApp) {
		this.ownerApp = ownerApp;
	}
	
	SelectionController.prototype = {
		clear: function() {
			var prj = this.ownerApp.getCurrentProject();
			prj.forEachLayer(function(index, layer){
				console.log("ToDo: clear", index)
			});
		}
	};

	aGlobal.mobmap.SelectionController = SelectionController;
})(window);