if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function ToolPane(containerElement) {
		this.ownerApp = null;
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
	}
	
	ToolPane.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
		}
	};
	
	aGlobal.mobmap.ToolPane = ToolPane;
})(window);