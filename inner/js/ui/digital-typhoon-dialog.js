if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function DigitalTyphoonDialog() {
		this.initProperties();
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
			}
		}
	};
	
	
	aGlobal.mobmap.DigitalTyphoonDialog = DigitalTyphoonDialog;
})(window);