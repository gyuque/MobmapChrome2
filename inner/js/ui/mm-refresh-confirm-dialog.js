if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function RefreshConfirmDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}

	RefreshConfirmDialog.prototype = {
		open: function(callback, target_url) {
			this.ensureWindowElement();
			this.updateMessage(target_url);
			
			this.showDialog();
			this.okCallback = callback;
		},

		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();

				this.addOKButton();
				this.addCancelButton();
			}
		},
		
		updateMessage: function(url) {
			this.jMessageArea.html("Refresh data from " + url);
		},

		showDialog: function() {
			this.showDialogOnCenter('Refresh data');
		}
	}
	
	mobmap.MMDialogBaseInstallAPIs(RefreshConfirmDialog.prototype);
	aGlobal.mobmap.RefreshConfirmDialog = RefreshConfirmDialog;
})(window);
