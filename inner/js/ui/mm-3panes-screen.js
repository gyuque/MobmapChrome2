if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	// Pane View Manager - - - - - - - - - - - - - - - - -
	function Mobmap3PanesScreen(paneOuterId, bodyPaneId, toolsPaneId) {
		this.toolsPaneElement = this.outerElement = this.jOuterElement = null;
		this.outerSplitter = null;
		// ----------------------------------------------------------

		this.toolsHeight = 28;
		this.fetchElements(paneOuterId, bodyPaneId, toolsPaneId);
		
		this.fitToWindow();
		this.buildPanes(bodyPaneId);
	}
	
	var proto = Mobmap3PanesScreen.prototype;

	// Initialize ------------------------------------------
	proto.fetchElements = function(paneOuterId, bodyPaneId, toolsPaneId) {
		this.toolsPaneElement = document.getElementById(toolsPaneId);
		this.outerElement = document.getElementById(paneOuterId);
		this.jOuterElement = $(this.outerElement);
	};
	
	proto.buildPanes = function(bodyPaneId) {
		// Panes:
		//  Tools
		//  --------------
		//  others
		
		this.outerSplitter = $(this.outerElement).kendoSplitter({
			orientation: "vertical",
			panes: [{resizable: false,size:$px(this.toolsHeight), scrollable:false},{resizable: true, scrollable:false}]
		});

		this.buildInsideBodyPane(bodyPaneId);
	};
	
	proto.buildInsideBodyPane = function(bodyPaneId) {
		// Panes:
		//  Loader,Layers |  Map

		var bodyPane = document.getElementById(bodyPaneId);
		var splitter = $(bodyPane).kendoSplitter({
			orientation: "horizontal",
			panes:[{collapsible: true, size:'192px'},{}]
		});
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