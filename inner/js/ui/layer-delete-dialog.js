if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerDeleteDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}
	
	LayerDeleteDialog.prototype = {
		// base
		initProperties: mobmap.MMDialogBase.initProperties,
		buildView: mobmap.MMDialogBase.buildView,
		getDialog: mobmap.MMDialogBase.getDialog,
		showDialogOnCenter: mobmap.MMDialogBase.showDialogOnCenter,
		addOKButton: mobmap.MMDialogBase.addOKButton,
		addCancelButton: mobmap.MMDialogBase.addCancelButton,
		onOK: mobmap.MMDialogBase.defaultOnOK,
		onCancel: mobmap.MMDialogBase.defaultOnCancel,

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
	
	aGlobal.mobmap.LayerDeleteDialog = LayerDeleteDialog;
})(window);