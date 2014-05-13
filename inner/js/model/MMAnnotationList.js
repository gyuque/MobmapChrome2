if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var gNextAnnId = 1;

	function MMAnnotationList() {
		this.jElement = $( createEventDummyElement() );
		this.list = [];
	}
	
	MMAnnotationList.prototype = {
		setParentEventElement: function(parentEventElement) {
			replaceParentEventElement(this.jElement[0], parentEventElement);
		},

		eventDispatcher: function() {
			return this.jElement;
		}
	};
	
	// annotation objects
	
	function MMGateAnnotation() {
		this.id = ++gNextAnnId;
	}
	
	MMGateAnnotation.prototype = {
		
	};
	
	mobmap.MMAnnotationList = MMAnnotationList;
})(window);