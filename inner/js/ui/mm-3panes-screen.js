if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	// Pane View Manager - - - - - - - - - - - - - - - - -
	function Mobmap3PanesScreen(paneOuterId, bodyPaneId, toolsPaneId) {
		this.toolsPaneElement = this.outerElement = this.jOuterElement = null;
		this.outerSplitter = this.toolsTabstrip = null;
		// ----------------------------------------------------------

		this.toolsHeight = 28;
		this.fetchElements(paneOuterId, bodyPaneId, toolsPaneId);
		
		this.buildPanes();
		this.fitToWindow();
	}
	
	var proto = Mobmap3PanesScreen.prototype;

	// Initialize ------------------------------------------
	proto.fetchElements = function(paneOuterId, bodyPaneId, toolsPaneId) {
		this.toolsPaneElement = document.getElementById(toolsPaneId);
		this.outerElement = document.getElementById(paneOuterId);
		this.jOuterElement = $(this.outerElement);
	};
	
	proto.buildPanes = function() {
		
	};
	
	// Resize handler --------------------------------------
	proto.fitToWindow = function() {
		var j = $(window);
		var closure = this.resizePanes.bind(this, j);
		j.resize(closure);
		
		closure();
	};

	proto.resizePanes = function(jResizeParent) {
		var h = jResizeParent.height();
		this.jOuterElement.height(h);
	};
	
	// +++ Export +++
	aGlobal.mobmap.Mobmap3PanesScreen = Mobmap3PanesScreen;
})(window);