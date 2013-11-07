if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function MMProject() {
		this.layerList = new LayerList();
	}
	
	MMProject.prototype = {
		
	};
	
	// ---------------------------
	function LayerList() {
		
	}
	
	LayerList.prototype = {
		
	};
	
	// +++ Export +++
	aGlobal.mobmap.MMProject = MMProject;
})(window);