if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LoadErrorDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}
	
	LoadErrorDialog.prototype = {
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
	
	mobmap.MMDialogBaseInstallAPIs(LoadErrorDialog.prototype);
	aGlobal.mobmap.LoadErrorDialog = LoadErrorDialog;
})(window);