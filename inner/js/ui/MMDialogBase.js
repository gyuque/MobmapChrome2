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
		
		showDialogOnCenter: function(title, dontAnimate) {
			var opt = {
				modal:true,
				pinned: true,
				width: 384,
				height: 72,
				title: title
			};
			
			if (dontAnimate) {
				opt.animation = false;
			}
			
			this.jElement.kendoWindow(opt);
			
			var dialog = this.getDialog();
			dialog.open();
			dialog.center();
		},
		
		addOKButton: function(labelText) {
			var okButton = document.createElement('button');
			this.buttonAreaElement.appendChild(okButton);
			$(okButton).text(labelText || 'OK').click(this.defaultOnOK.bind(this));
		},
		
		addCancelButton: function(labelText) {
			var cancelButton = document.createElement('button');
			this.buttonAreaElement.appendChild(cancelButton);
			$(cancelButton).text(labelText || 'Cancel').click(this.defaultOnCancel.bind(this));
		},
		
		defaultOnOK: function() {
			if (this.onOK) {
				return this.onOK();
			}
			
			if (this.okCallback) {
				this.okCallback();
				this.okCallback = null;
			}

			this.close();
		},
		
		defaultOnCancel: function() {
			if (this.onCancel) {
				return this.onCancel();
			}
			
			this.close();
		},
		
		close: function() {
			this.getDialog().close();
		}
	};
	
	aGlobal.mobmap.MMDialogBaseInstallAPIs = function(proto) {
		var base = aGlobal.mobmap.MMDialogBase;
		for (var i in base) if (base.hasOwnProperty(i)) {
			proto[i] = base[i];
		}
	};
	
})(window);