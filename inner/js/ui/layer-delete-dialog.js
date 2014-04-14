if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerDeleteDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}
	
	LayerDeleteDialog.prototype = {
		openWithLayer: function(targetLayer, callback) {
			this.ensureWindowElement();

			this.updateMessage(targetLayer);
			this.showDialog();
			
			this.okCallback = callback;
		},
		
		updateMessage: function(targetLayer) {
			var msg = "Layer '" + targetLayer.getShortDescription() + "' will be deleted.";
			this.jMessageArea.text(msg);
		},
		
		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
				
				this.addOKButton();
				this.addCancelButton('Don\'t delete');
			}
		},

		showDialog: function() {
			this.showDialogOnCenter('Delete layer');
		}
	};
	
	mobmap.MMDialogBaseInstallAPIs(LayerDeleteDialog.prototype);
	aGlobal.mobmap.LayerDeleteDialog = LayerDeleteDialog;
})(window);