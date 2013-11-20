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
		this.itemsContainerElement = this.generateItemsContainer();
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
			this.updateLayerViews();
		},
		
		generateItemsContainer: function() {
			var el = $H('div', 'mm-layer-list-items-container');
			this.containerElement.appendChild(el);
			return el;
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
		
		hideWelcomeBox: function() {
			this.jWelcomeBox.hide();
		},
		
		onWelcomeLocalCSVClick: function() {
			this.requestAddLocalCSVLayer();
		},
		
		requestAddLocalCSVLayer: function() {
			this.ownerApp.loadLocalCSVMovingData();
		},
		
		// ------------------------------
		updateLayerViews: function() {
			var nextInView = null;
			
			var prj = this.ownerApp.getCurrentPeoject();
			var ls = prj.layerList;
			var len = ls.getCount();
			for (var i = 0;i < len;++i) {
				if (i > 0) {
					nextInView = ls.getLayerAt(i - 1);
				}
				
				var layer = ls.getLayerAt(i);
				if (!layer.hasPrimaryView()) {
					
					var lv = new LayerItemView();
					layer.primaryView = lv;
					this.appendLayerItemView(layer.primaryView,
						nextInView ? nextInView.primaryView : null);
					
					
					console.log("Needs view"); // This layer needs new view.
				}
			}
		},
		
		appendLayerItemView: function(newView, nextView) {
			console.log(newView, nextView)
			
			this.itemsContainerElement.insertBefore(
				newView.element,
				nextView ? nextView.element : null);
		}
	};
	
	// Layer item view
	function LayerItemView() {
		this.progressBar = null;
		this.progressLabel = null;
		
		this.element = $H('div', 'mm-layer-view-item-box');
		this.jElement = $(this.element);
		this.build();
	}
	
	LayerItemView.prototype = {
		build: function() {
			// Caption ---------------------
			var caption = $H('h3');
			caption.appendChild($T('Moving objects'));
			
			this.element.appendChild(caption);

			// Progress bar ---------------------
			this.progressLabel = $H('div', 'mm-layer-loading-label');
			this.progressLabel.appendChild( $T('Loading...') );

			this.progressBar = new mobmap.MiniProgressBar(100);
			this.progressBar.setRatio(0.2);

			this.element.appendChild(this.progressLabel);
			this.element.appendChild(this.progressBar.element);
		}
	};
	
	// +++ Export +++
	aGlobal.mobmap.LayersView = LayersView;
})(window);