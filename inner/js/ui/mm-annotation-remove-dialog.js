if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function AnnotationRemoveDialog() {
		this.initProperties();
		this.ensureWindowElement();
	}
	
	AnnotationRemoveDialog.prototype = {
		openWithAnnotation: function(annotation, callback) {
			this.ensureWindowElement();
			this.updateMessage(annotation);
			this.showDialog();
			
			this.okCallback = callback;
		},

		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();

				this.addOKButton();
				this.addCancelButton('Don\'t delete');
			}
		},
		
		updateMessage: function(annotation) {
			var msg = "Annotation '" + annotation.description + "', '"+ annotation.contentString + "' will be removed.";
			this.jMessageArea.text(msg);
		},
	

		showDialog: function() {
			this.showDialogOnCenter('Remove annotation');
		}
	};

	mobmap.MMDialogBaseInstallAPIs(AnnotationRemoveDialog.prototype);
	aGlobal.mobmap.AnnotationRemoveDialog = AnnotationRemoveDialog;
})(window);