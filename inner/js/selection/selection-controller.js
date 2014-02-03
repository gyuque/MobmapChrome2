if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function SelectionController(ownerApp) {
		this.ownerApp = ownerApp;
		this.currentSelectionSession = null;
		this.responders = [];
	}
	
	SelectionController.prototype = {
		clear: function() {
			var prj = this.ownerApp.getCurrentProject();
			prj.forEachLayer(function(index, layer){
				console.log("ToDo: clear", index)
			});
		},
		
		addResponder: function(r) {
			if (this.responders.indexOf(r) >= 0) {
				return false;
			}
			
			this.responders.push(r);
			return true;
		}
	};
	
	var SelectionControllerResponderMethodList = {
		// name          | required
		selWillStart     : false
	};

	aGlobal.mobmap.SelectionController = SelectionController;
})(window);