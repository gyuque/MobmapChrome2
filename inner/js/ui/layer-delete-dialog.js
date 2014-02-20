if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function LayerDeleteDialog() {
		this.element = null;
		this.jElement = null;
		this.jMessageArea = null;
		this.okCallback = null;

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
				var el = document.createElement('div');
				el.style.display = "none";
				
				this.element = el;
				this.jElement = $(el);
				
				// contents
				var msg_area = document.createElement('div');
				this.jMessageArea = $(msg_area);
				el.appendChild(msg_area);
				
				var buttons_area = document.createElement('div');
				var okButton = document.createElement('button');
				var cancelButton = document.createElement('button');
				buttons_area.setAttribute('class', 'mm-layer-delete-dialog-buttons');
				buttons_area.appendChild(okButton);
				buttons_area.appendChild(cancelButton);
				el.appendChild(buttons_area);
				
				$(okButton).text('OK').click(this.onOK.bind(this));
				$(cancelButton).text('Don\'t delete').click(this.onCancel.bind(this));

				document.body.appendChild(el);
			}
		},
		
		onOK: function() {
			if (this.okCallback) {
				this.okCallback();
				this.okCallback = null;
			}

			this.getDialog().close();
		},
		
		onCancel: function() {
			this.getDialog().close();
		},
		
		showDialog: function() {
			this.jElement.kendoWindow({
				modal:true,
				pinned: true,
				width: 384,
				height: 72,
				title: 'Delete layer'
			});
			
			var dialog = this.getDialog();
			dialog.open();
			dialog.center();
		},
		
		getDialog: function() {
			return this.jElement.data("kendoWindow");
		}
	};
	
	aGlobal.mobmap.LayerDeleteDialog = LayerDeleteDialog;
})(window);