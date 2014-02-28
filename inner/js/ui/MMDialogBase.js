if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	aGlobal.mobmap.MMDialogBase = {
		initProperties: function() {
			this.element = null;
			this.jElement = null;
			this.jMessageArea = null;
		},
		
		buildView: function() {
			// outer
			var el = document.createElement('div');
			el.style.display = "none";
			
			this.element = el;
			this.jElement = $(el);

			// contents
			var msg_area = document.createElement('div');
			this.jMessageArea = $(msg_area);
			el.appendChild(msg_area);
		}
	};
})(window);