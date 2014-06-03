if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function GateBusyDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}
	
	GateBusyDialog.prototype = {
		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
			}
		},
		
		showDialog: function() {
			this.jMessageArea.text("Processing...");
			this.showDialogOnCenter('Gate selection', true);
		},
		
		showProgress: function(rate) {
			var pc = Math.floor(rate * 100.0);
			this.jMessageArea.text(pc + "% done");
		}
	};

	mobmap.MMDialogBaseInstallAPIs(GateBusyDialog.prototype);
	aGlobal.mobmap.GateBusyDialog = GateBusyDialog;
})(window);