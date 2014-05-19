if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function FillValueDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}

	FillValueDialog.prototype = {
		open: function(callback) {
			this.ensureWindowElement();
			this.showDialog();
			this.okCallback = callback;
		},

		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
				this.jMessageArea.html("This is a destructive operation!<br>Continue?");

				this.addOKButton();
				this.addCancelButton();
			}
		},
		

		showDialog: function() {
			this.showDialogOnCenter('Value fill');
		}	
	};
	
	mobmap.MMDialogBaseInstallAPIs(FillValueDialog.prototype);
	aGlobal.mobmap.FillValueDialog = FillValueDialog;
})(window);