if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function DigitalTyphoonDialog() {
		this.initProperties();
		this.jURLinput = null;
		this.ensureWindowElement();
	}
	
	DigitalTyphoonDialog.prototype = {
		// base
		initProperties: mobmap.MMDialogBase.initProperties,
		buildView: mobmap.MMDialogBase.buildView,
		getDialog: mobmap.MMDialogBase.getDialog,
		showDialogOnCenter: mobmap.MMDialogBase.showDialogOnCenter,
		addOKButton: mobmap.MMDialogBase.addOKButton,
		addCancelButton: mobmap.MMDialogBase.addCancelButton,
		onOK: mobmap.MMDialogBase.defaultOnOK,
		onCancel: mobmap.MMDialogBase.defaultOnCancel,

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
	
	
	aGlobal.mobmap.DigitalTyphoonDialog = DigitalTyphoonDialog;
})(window);