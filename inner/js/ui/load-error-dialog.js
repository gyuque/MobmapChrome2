if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LoadErrorDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}
	
	LoadErrorDialog.prototype = {
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

				this.addOKButton();
			}
		},

		showDialog: function() {
			this.jMessageArea.text("Selected file has a problem.");
			this.showDialogOnCenter('Load error');
		}
	}
	
	aGlobal.mobmap.LoadErrorDialog = LoadErrorDialog;
})(window);