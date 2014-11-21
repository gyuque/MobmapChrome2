if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function ResetDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}
	
	ResetDialog.prototype = {
		open: function(callback) {
			this.ensureWindowElement();
			this.showDialog();
			this.okCallback = callback;
		},

		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
				this.jMessageArea.html("Restart this application?");

				this.addOKButton();
				this.addCancelButton();
			}
		},
		
		showDialog: function() {
			this.showDialogOnCenter('Restart');
		}
	};

	mobmap.MMDialogBaseInstallAPIs(ResetDialog.prototype);
	aGlobal.mobmap.ResetDialog = ResetDialog;
})(window);