if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var gNextAnnId = 1;

	function MMAnnotationList() {
		this.jElement = $( createEventDummyElement() );
		this.list = [];
		
		addTestAnnotation(this);
	}
	
	MMAnnotationList.prototype = {
		setParentEventElement: function(parentEventElement) {
			replaceParentEventElement(this.jElement[0], parentEventElement);
		},

		eventDispatcher: function() {
			return this.jElement;
		},
		
		getRawList: function() {
			return this.list;
		},
		
		append: function(a) {
			if (this.list.indexOf(a) < 0) {
				this.list.push(a);
			}
		}
	};

	function addTestAnnotation(alist) {
		var g1 = new MMGateAnnotation();
		alist.append(g1);
	}
	
	// annotation objects
	
	function MMGateAnnotation() {
		this.id = gNextAnnId++;
		this.typeName = 'Line Gate';
	}
	
	MMGateAnnotation.prototype = {
		
	};
	
	mobmap.MMAnnotationList = MMAnnotationList;
})(window);