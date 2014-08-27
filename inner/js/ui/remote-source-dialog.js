if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function RemoteSourceDialog() {
		this.initProperties();
		this.jURLinput = null;
		this.jAutoloadCheck = null;
		this.ensureWindowElement();
	}
	
	RemoteSourceDialog.prototype = {
		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
				
				var form_box = this.jMessageArea[0];
				var url_input = document.createElement('input');
				url_input.type = "text";
				url_input.size = 52;
				form_box.appendChild( document.createTextNode('URL ') );
				form_box.appendChild(url_input);
				this.jURLinput = $(url_input);
				
				form_box.appendChild( document.createElement('br') );
				var autoload_check = this.generateCheck(form_box);
				this.jAutoloadCheck = $(autoload_check);

				this.addOKButton();
				this.addCancelButton();
			}
		},
		
		generateCheck: function(container) {
			var lab = document.createElement('label');
			var chk = document.createElement('input');
			chk.type = "checkbox";
			lab.appendChild(chk);
			lab.appendChild( document.createTextNode('Add a random parameter to force refresh') );
			
			container.appendChild(lab);
			return chk;
		},
		
		beforeOpen: function() {
			this.jURLinput.val('');
			this.jAutoloadCheck.removeAttr('checked');
		},

		getURL: function() {
			return this.jURLinput.val();
		},
		
		getRefreshTokenEnabled: function() {
			return this.jAutoloadCheck[0].checked;
		}
	}
	
	mobmap.MMDialogBaseInstallAPIs(RemoteSourceDialog.prototype);
	aGlobal.mobmap.RemoteSourceDialog = RemoteSourceDialog;
})(window);
