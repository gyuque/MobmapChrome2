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
			this.observeProject();
		},
		
		observeApp: function() {
			var ed = this.ownerApp.eventDispatcher();
			ed.bind(mobmap.Mobmap2App.PROJECT_SET_EVENT, this.onAppProjectSet.bind(this));
		},
		
		observeProject: function() {
			var prj = this.ownerApp.getCurrentProject();
			if (prj) {
				var ed = prj.eventDispatcher();
				ed.bind(mobmap.MMProject.LAYERLIST_CHANGE, this.onLayerListChange.bind(this));
			}
		},

		onAppProjectSet: function() {
			this.observeProject();
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
			
			var btnOpenService = this.setupDownloaderServiceButton();
			var btnLoadMesh = this.setupMeshLoadButton();
			
			var src_h = $H('header', 'mm-welcome-heading');
			src_h.appendChild($T('Select initial data.'));
			box.appendChild(src_h);
			
			var sources = $H('div', 'mm-welcome-sources');
			sources.appendChild(btnLocalCSV);
			sources.appendChild(btnOpenService);
			sources.appendChild(btnLoadMesh);
			box.appendChild(sources);

			this.containerElement.appendChild(box);
			return $(box);
		},
		
		setupDownloaderServiceButton: function() {
			var btn = $H('button', 'mm-data-service-button');
			btn.appendChild($T('Open Download Service'));
			
			$(btn).click( this.onDownloadServiceButtonClick.bind(this) );
			
			return btn;
		},
		
		setupMeshLoadButton: function() {
			var btn = $H('button', 'mm-initial-mesh-load-button');
			btn.appendChild($T('Local Mesh'));
			
			$(btn).click( this.onLoadMeshButtonClick.bind(this) );
			
			return btn;
		},
		
		onDownloadServiceButtonClick: function() {
			this.ownerApp.openDataDownloadService();
		},
		
		onLoadMeshButtonClick: function() {
			this.ownerApp.loadLocalCSVMeshData();
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
			
			var prj = this.ownerApp.getCurrentProject();
			var ls = prj.layerList;
			var len = ls.getCount();

			for (var i = 0;i < len;++i) {
				if (i > 0) {
					nextInView = ls.getLayerAt(i - 1);
				}
				
				var layer = ls.getLayerAt(i);
				if (!layer.hasPrimaryView()) {
					
					var lv = new LayerItemView(layer);
					layer.primaryView = lv;
					this.appendLayerItemView(layer.primaryView,
						nextInView ? nextInView.primaryView : null);
					
					
					console.log("Needs view"); // This layer needs new view.
				}
				
				if (!layer._lvObserved) {
					layer._lvObserved = true;
					
					layer.eventDispatcher().
					 bind(mobmap.LayerEvent.LoadWillStart, this.willStartLayerLoad.bind(this)).
					 bind(mobmap.LayerEvent.LoadProgressChange, this.onLayerLoadProgressChange.bind(this, layer)).
					 bind(mobmap.LayerEvent.LoadFinish, this.onLayerLoadFinish.bind(this));
				}
			}
		},
		
		appendLayerItemView: function(newView, nextView) {
			console.log(newView, nextView)
			
			this.itemsContainerElement.insertBefore(
				newView.element,
				nextView ? nextView.element : null);
		},
		
		willStartLayerLoad: function(e, layer) {
			if (layer.hasPrimaryView()) {
				layer.primaryView.setSubCaption(layer.getShortDescription());
			}
		},
		
		onLayerLoadProgressChange: function(layer, e, progressRatio) {
			if (layer.hasPrimaryView()) {
				layer.primaryView.showProgress(progressRatio);
			}
		},
		
		onLayerLoadFinish: function(e, layer) {
			if (layer.hasPrimaryView()) {
				var lv = layer.primaryView;
				lv.setLayerReady(true);
				lv.setSubCaption(layer.getShortDescription());
				lv.updateAdditionalPropertyList();
			}
		}
	};
	
	// Layer item view
	function LayerItemView(layer) {
		this.boundLayer = layer;
		
		this.progressBar = null;
		this.progressLabel = null;
		this.subCaptionElement = null;
		this.markerPanel = null;
		
		this.element = $H('div', 'mm-layer-view-item-box');
		this.jElement = $(this.element);
		this.build();
		
		this.layerReady = false;
	}
	
	LayerItemView.prototype = {
		build: function() {
			var use_marker = !!(this.boundLayer.capabilities & mobmap.LayerCapability.MarkerRenderable);
			
			// Caption ---------------------
			var caption = $H('h3');
			caption.appendChild($T( this.makeLayerTypeString() ));
			this.element.appendChild(caption);

			var sub_caption = $H('h4');
			sub_caption.appendChild($T('CSV File'));
			this.element.appendChild(sub_caption);
			this.subCaptionElement = sub_caption;

			// Progress bar ---------------------
			this.progressLabel = $H('div', 'mm-layer-loading-label');
			this.progressLabel.appendChild( $T('Loading...') );

			this.progressBar = new mobmap.MiniProgressBar(100);
			this.progressBar.setRatio(0);

			this.element.appendChild(this.progressLabel);
			this.element.appendChild(this.progressBar.element);
			
			if (use_marker) {
				this.buildMarkerConfigurationPanel();
			}
		},
		
		makeLayerTypeString: function() {
			if (this.boundLayer.capabilities & mobmap.LayerCapability.MarkerRenderable) {
				return "Moving objects";
			} else {
				return "Mesh";
			}
		},
		
		buildMarkerConfigurationPanel: function() {
			this.markerPanel = new mobmap.MarkerConfigurationPanel(this.boundLayer.markerGenerator);
			this.markerPanel.hide();
			this.element.appendChild(this.markerPanel.element);
		},
		
		setSubCaption: function(label) {
			$(this.subCaptionElement).text(label);
		},
		
		showProgress: function(ratio) {
			this.progressBar.setRatio(ratio);
		},
		
		hideProgress: function() {
			this.progressBar.hide();
			this.progressLabel.style.display = 'none';
		},
		
		setLayerReady: function(r) {
			this.layerReady = r;
			this.toggleVisibilities();
		},
		
		toggleVisibilities: function() {
			if (this.layerReady) {
				this.hideProgress();
				if (this.markerPanel) {
					this.markerPanel.show();
				}
			}
		},
		
		updateAdditionalPropertyList: function() {
			var mp = this.markerPanel;
			if (!mp) {return;}

			mp.clearAdditionalPropertyList();

			var lyr = this.boundLayer;
			if (!lyr) {return;}
			if (!lyr.dataReady) {return;}
			
			var mdat = lyr.movingData;
			mdat.forEachExtraProperty(function(attrName, flags){
				mp.addAdditionalPropertyName(attrName);
			});
		}
	};
	
	// +++ Export +++
	aGlobal.mobmap.LayersView = LayersView;
})(window);