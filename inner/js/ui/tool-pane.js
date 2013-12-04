if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function ToolPane(containerElement) {
		// Initialize - - - - - - - -
		this.ownerApp = null;
		this.timelineBar = new mobmap.TimelineBar();
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		// - - - - - - - - - - - - - -
		
		this.setupWidgets();
	}
	
	ToolPane.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
		},
		
		setupWidgets: function() {
			this.containerElement.appendChild( this.timelineBar.element );
		}
	};
	
	aGlobal.mobmap.ToolPane = ToolPane;
})(window);