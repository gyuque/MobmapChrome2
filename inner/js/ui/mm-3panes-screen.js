if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	// Pane View Manager - - - - - - - - - - - - - - - - -
	function Mobmap3PanesScreen(paneOuterId, bodyPaneId, toolsPaneId) {
		this.toolsPaneElement = this.outerElement = this.infoPaneElement = 
		 this.contentElement = this.jOuterElement = null;
		this.outerSplitter = null;
		// ----------------------------------------------------------

		this.jEventDispatcherElement = $(document.body);
		this.toolsHeight = 68;
		this.fetchElements(paneOuterId, bodyPaneId, toolsPaneId);
		
		this.fitToWindow();
		this.buildPanes(bodyPaneId);
	}
	
	var proto = Mobmap3PanesScreen.prototype;
	Mobmap3PanesScreen.RESIZE_EVENT = "mmscreen-resize";
	proto.getToolsPaneElement = function() { return this.toolsPaneElement; };
	proto.getInfoPaneElement = function() { return this.infoPaneElement; };
	proto.getContentPaneElement = function() { return this.contentElement; };

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
		var jBody = $(bodyPane);
		var splitter = jBody.kendoSplitter({
			orientation: "horizontal",
			panes:[{collapsible: true, size:'240px', scrollable:false},{scrollable:false}],
			collapse: this.onInfoPaneCollapse.bind(this),
			expand: this.onInfoPaneExpand.bind(this),
			resize: this.onInfoPaneSplitterResize.bind(this)
		});
		
		// Pick up child panes
		var childPanes = jBody.find('>div.mm-pane');
		this.infoPaneElement = childPanes[0] || null;
		this.contentElement  = childPanes[1] || null;
	};
	
	proto.eventDispatcher = function() {
		return this.jEventDispatcherElement;
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
		
		var j = this.eventDispatcher();
		setTimeout(j.trigger.bind(j, Mobmap3PanesScreen.RESIZE_EVENT), 1);
	};
	
	proto.onInfoPaneCollapse = function() {
		this.fitToWindow();
	};
	
	proto.onInfoPaneExpand = function() {
		this.fitToWindow();
	};
	
	proto.onInfoPaneSplitterResize = function() {
		this.fitToWindow();
	};
	
	// +++ Export +++
	aGlobal.mobmap.Mobmap3PanesScreen = Mobmap3PanesScreen;
})(window);