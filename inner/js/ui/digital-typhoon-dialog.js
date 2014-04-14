if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function DigitalTyphoonDialog() {
		this.initProperties();
		this.jURLinput = null;
		this.ensureWindowElement();
	}
	
	DigitalTyphoonDialog.prototype = {
		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
				
				var url_input = document.createElement('input');
				url_input.size = 52;
				this.jMessageArea[0].appendChild( document.createTextNode('URL ') );
				this.jMessageArea[0].appendChild(url_input);
				this.jURLinput = $(url_input);

				this.addOKButton();
				this.addCancelButton();
				
				this.jURLinput.keypress( (function (e) { 
					if (e.which === 13) { this.onOK(); }
				}).bind(this) );
			}
		},
		
		getURL: function() {
			return this.jURLinput.val();
		}
	};
	
	mobmap.MMDialogBaseInstallAPIs(DigitalTyphoonDialog.prototype);
	aGlobal.mobmap.DigitalTyphoonDialog = DigitalTyphoonDialog;
})(window);