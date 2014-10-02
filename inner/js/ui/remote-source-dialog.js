if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var DEFAULT_PAGE = 'subpage/remote-dl-initial.html';
	
	function RemoteSourceDialog(ownerApp) {
		this.ownerApp = ownerApp;
//		this.UIProviderURL = 'http://ushiroad.com/private/sv/remote-service-dmy.html';
		this.UIProviderURL = DEFAULT_PAGE;
		this.jProviderInput = null;
		
		this.initProperties();
		this.serviceAreaContainer = null;
		this.serviceAreaFrame = null;
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
				url_input.id = "query-service-csv-url-input";
				url_input.type = "text";
				url_input.size = 52;
				form_box.appendChild( document.createTextNode('CSV URL ') );
				form_box.appendChild(url_input);
				this.jURLinput = $(url_input);
				
				form_box.appendChild( document.createElement('br') );
				var autoload_check = this.generateCheck(form_box);
				this.jAutoloadCheck = $(autoload_check);

				this.addServiceCaption(form_box);
				this.addServiceView(form_box);
				this.addOKButton();
				this.addCancelButton();
				
				this.updateProviderURLBox();
			}
		},

		addServiceCaption: function(containerElement) {
			var caption = document.createElement('div');
			caption.id = 'query-service-caption';
			
			caption.innerHTML = 'Provider: ';
			var tx = document.createElement('input');
			tx.type = 'text';
			this.jProviderInput = $(tx);
			caption.appendChild(tx);
			
			var premove = document.createElement('button');
			premove.innerHTML = 'Remove';
			premove.id = 'query-service-provider-remove-button';
			caption.appendChild(premove);
			$(premove).click(this.removeProviderURL.bind(this));

			containerElement.appendChild(caption);
			
			this.jProviderInput.
			 focus( this.onProviderInputFocus.bind(this) ).
			 keyup( this.onProviderInputKeyup.bind(this) ).
			 blur( this.updateProviderURLBox.bind(this) );
		},
		
		extractHostName: function(u) {
			if (!isValidProviderURL(u)) {
				return "http://";
			}
			
			var re = /:\/\/+([^\/]+)/ ;
			if (u.match(re)) {
				return RegExp['$1'];
			}
			
			return u;
		},
		
		addServiceView: function(containerElement) {
			this.serviceAreaContainer = document.createElement('div');

			var iframe = document.createElement('iframe');
			iframe.id = 'query-service-frame';
			iframe.src = this.UIProviderURL;
			this.serviceAreaContainer.appendChild(iframe);

			this.serviceAreaFrame = iframe;
			containerElement.appendChild(this.serviceAreaContainer);
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
		
		setURL: function(u) {
			this.jURLinput.val(u);
		},
		
		getRefreshTokenEnabled: function() {
			return this.jAutoloadCheck[0].checked;
		},
		
		onProviderInputKeyup: function(e) {
			if (e.keyCode === 27) {
				this.jProviderInput.blur();
			} else if (e.keyCode === 13) {
				this.navigateProviderURL();
				this.jProviderInput.blur();
			}
		},
		
		onProviderInputFocus: function() {
			if (this.UIProviderURL === DEFAULT_PAGE) {
				this.jProviderInput.val('');
			} else {
				this.jProviderInput.val( this.UIProviderURL );
			}
		},
		
		navigateProviderURL: function() {
			var url = this.jProviderInput.val();
			if (isValidProviderURL(url)) {
				if (this.ownerApp) {
					this.ownerApp.saveRemoteDownloaderURL(url);
				}
				
				this.UIProviderURL = url;
				this.serviceAreaFrame.src = url;
			}
		},
		
		removeProviderURL: function() {
			if (this.ownerApp) {
				this.ownerApp.saveRemoteDownloaderURL(null);
			}
			
			this.UIProviderURL = DEFAULT_PAGE;
			this.serviceAreaFrame.src = DEFAULT_PAGE;
			this.updateProviderURLBox();
		},
		
		updateProviderURLBox: function() {
			this.jProviderInput.val( this.extractHostName(this.UIProviderURL) );
		}
	}

	function isValidProviderURL(u) {
		var valid = /^(file|https?):\/\/+[-.0-9a-zA-Z]+/ ;
		return !!u.match(valid) ;
	}

	mobmap.MMDialogBaseInstallAPIs(RemoteSourceDialog.prototype);
	aGlobal.mobmap.RemoteSourceDialog = RemoteSourceDialog;
})(window);
