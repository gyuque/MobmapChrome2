if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	aGlobal.mobmap.MMDialogBase = {
		initProperties: function() {
			this.element = null;
			this.buttonAreaElement = null;
			this.jElement = null;
			this.jMessageArea = null;
			this.okCallback = null;
		},
		
		buildView: function() {
			// outer
			var el = document.createElement('div');
			el.style.display = "none";
			
			this.element = el;
			this.jElement = $(el);

			// contents
			var msg_area = document.createElement('div');
			this.jMessageArea = $(msg_area);
			el.appendChild(msg_area);
			
			this.buttonAreaElement = document.createElement('div');
			this.buttonAreaElement.setAttribute('class', 'mm-layer-delete-dialog-buttons');
			el.appendChild(this.buttonAreaElement);

			document.body.appendChild(el);
		},
		
		getDialog: function() {
			return this.jElement.data("kendoWindow");
		},
		
		showDialogOnCenter: function(title) {
			this.jElement.kendoWindow({
				modal:true,
				pinned: true,
				width: 384,
				height: 72,
				title: title
			});
			
			var dialog = this.getDialog();
			dialog.open();
			dialog.center();
		},
		
		addOKButton: function(labelText) {
			var okButton = document.createElement('button');
			this.buttonAreaElement.appendChild(okButton);
			$(okButton).text(labelText || 'OK').click(this.onOK.bind(this));
		},
		
		addCancelButton: function(labelText) {
			var cancelButton = document.createElement('button');
			this.buttonAreaElement.appendChild(cancelButton);
			$(cancelButton).text(labelText || 'Cancel').click(this.onCancel.bind(this));
		},
		
		defaultOnOK: function() {
			if (this.okCallback) {
				this.okCallback();
				this.okCallback = null;
			}

			this.getDialog().close();
		},
		
		defaultOnCancel: function() {
			this.getDialog().close();
		}
	};
})(window);