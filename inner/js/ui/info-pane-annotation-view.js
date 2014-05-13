if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function AnnotationListView(containerElement) {
		this.ownerApp = null;
		// -----------------		
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);

		// this.buildView();
	}
	
	AnnotationListView.prototype = {
		
	};

	// +++ Export +++
	aGlobal.mobmap.AnnotationListView = AnnotationListView;
})(window);