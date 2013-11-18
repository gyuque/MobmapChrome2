if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function LayersView(containerElement) {
		this.ownerApp = null;
		this.jWelcomeBox = null;
		// -----------------
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		
		this.jWelcomeBox = this.generateWelcomeBox();
	}

	LayersView.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
			this.observeApp();
			this.observePeoject();
		},
		
		observeApp: function() {
			var ed = this.ownerApp.eventDispatcher();
			ed.bind(mobmap.Mobmap2App.PROJECT_SET_EVENT, this.onAppProjectSet.bind(this));
		},
		
		observePeoject: function() {
			var prj = this.ownerApp.getCurrentPeoject();
			if (prj) {
				var ed = prj.eventDispatcher();
				ed.bind(mobmap.MMProject.LAYERLIST_CHANGE, this.onLayerListChange.bind(this));
			}
		},

		onAppProjectSet: function() {
			this.observePeoject();
		},
		
		onLayerListChange: function() {
			console.log("chg")
		},

		generateWelcomeBox: function() {
			var box = $H('div');
			box.id = 'mm-layers-welcome';
			box.appendChild($T('Welcome!'));
			
			var btnLocalCSV = $H('button');
			$(btnLocalCSV).text('Local CSV').click( this.onWelcomeLocalCSVClick.bind(this) );
			
			var src_h = $H('header', 'mm-welcome-heading');
			src_h.appendChild($T('Select initial data.'));
			box.appendChild(src_h);
			
			var sources = $H('div', 'mm-welcome-sources');
			sources.appendChild(btnLocalCSV);
			box.appendChild(sources);

			this.containerElement.appendChild(box);
			return $(box);
		},
		
		onWelcomeLocalCSVClick: function() {
			this.requestAddLocalCSVLayer();
		},
		
		requestAddLocalCSVLayer: function() {
			this.ownerApp.loadLocalCSVMovingData();
		}
	};
	
	// +++ Export +++
	aGlobal.mobmap.LayersView = LayersView;
})(window);