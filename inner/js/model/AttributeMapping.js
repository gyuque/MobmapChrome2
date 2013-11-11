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
		},
		
		setColumnIndex: function(name, index) {
			var a = this.nameMap[name];
			if (a) {
				a.csvColumnIndex = index;
			}
		}
	};


	function RecordAttributeMeta(name) {
		this.name = name;
		this.csvColumnIndex = -1;
	}
	
	// +++ Export +++
	aGlobal.mobmap.AttributeMapping = AttributeMapping;
})(window);