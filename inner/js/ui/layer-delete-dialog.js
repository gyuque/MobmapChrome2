if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerDeleteDialog() {
		this.element = null;
		this.jElement = null;
		this.jMessageArea = null;
	}
	
	LayerDeleteDialog.prototype = {
		openWithLayer: function(targetLayer) {
			this.ensureWindowElement();

			this.updateMessage(targetLayer);
			this.showDialog();
		},
		
		updateMessage: function(targetLayer) {
			var msg = "Layer '" + targetLayer.getShortDescription() + "' will be deleted.";
			this.jMessageArea.text(msg);
		},
		
		ensureWindowElement: function() {
			if (!this.element) {
				var el = document.createElement('div');
				
				this.element = el;
				this.jElement = $(el);
				
				// contents
				var msg_area = document.createElement('div');
				this.jMessageArea = $(msg_area);
				el.appendChild(msg_area);
				
				document.body.appendChild(el);
			}
		},
		
		showDialog: function() {
			this.jElement.kendoWindow({
				modal:true,
				pinned: true,
				width: 384,
				height: 96,
				title: 'Delete layer'
			});
			
			var dialog = this.jElement.data("kendoWindow");
			dialog.open();
			dialog.center();
		}
	};
	
	aGlobal.mobmap.LayerDeleteDialog = LayerDeleteDialog;
})(window);