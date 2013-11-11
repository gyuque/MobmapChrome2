if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function AttributeMapping() {
		this.nameMap = {};
	}
	
	AttributeMapping.prototype = {
		addAttribute: function(name) {
			var a = new RecordAttributeMeta(name);
			this.nameMap[name] = a;
			
			return a;
		}
	};


	function RecordAttributeMeta(name) {
		this.name = name;
		this.csvColumnIndex = -1;
	}
	
	// +++ Export +++
	aGlobal.mobmap.AttributeMapping = AttributeMapping;
})(window);