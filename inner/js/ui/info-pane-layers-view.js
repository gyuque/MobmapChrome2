if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	var kMenuNameAttr = "data-menuitem-name";
	var kMenuItemNameMOCSV = "add-movobjs-csv";
	var kMenuItemNameMeshCSV = "add-mesh-csv";
	var kMenuItemNameDigitalTyphoon = "add-digital-typhoon";

	function LayersView(containerElement) {
		this.ownerApp = null;
		this.jWelcomeBox = null;
		// -----------------
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		
		this.layerListMenuElement = this.generateLayerListMenuElement();
		this.jLayerListMenuElement = $(this.layerListMenuElement);
		this.jLayerListMenuElement.kendoMenu({ select: this.onLayerMenuSelect.bind(this) });
		
		this.jContainerElement.addClass('welcome');
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
				ed.bind(mobmap.MMProject.LAYERLIST_ORDER_SWAP, this.onLayerListOrderSwap.bind(this));
			}
		},

		onAppProjectSet: function() {
			this.observeProject();
		},
		
		onLayerListChange: function() {
			this.updateLayerViews();
		},
		
		onLayerListOrderSwap: function(e, layerList, i1, i2) {
			if (i1 > i2) {
				this.startSwapAnimation(i1, i2);
			} else {
				this.startSwapAnimation(i2, i1);
			}
		},
		
		generateItemsContainer: function() {
			var el = $H('div', 'mm-layer-list-items-container');
			this.containerElement.appendChild(el);
			return el;
		},
		
		generateLayerListMenuElement: function() {
			var el = $H('ul', 'mm-layer-list-menu');

			var li_add = $H('li');
			li_add.appendChild( $T('Add') );
			
			// Sub menu
			var ls_newLayers = $H('ul');
			li_add.appendChild(ls_newLayers);
			var li_mov = $H('li');
			li_mov.setAttribute(kMenuNameAttr, kMenuItemNameMOCSV);
			li_mov.appendChild( $T('Moving objects CSV') );
			ls_newLayers.appendChild(li_mov);
			var li_mesh = $H('li');
			li_mesh.setAttribute(kMenuNameAttr, kMenuItemNameMeshCSV);
			li_mesh.appendChild( $T('Mesh CSV') );
			ls_newLayers.appendChild(li_mesh);
			var li_ty = $H('li');
			li_ty.setAttribute(kMenuNameAttr, kMenuItemNameDigitalTyphoon);
			li_ty.appendChild( $T('Digital Typhoon') );
			ls_newLayers.appendChild(li_ty);

			el.appendChild(li_add);
			this.containerElement.appendChild(el);
			return el;
		},
		
		// Layer menu handlers - - - - - - - - - - -
		
		onLayerMenuSelect: function(e) {
			var selectedElement = e.item;
			if (!selectedElement) {return;}
			
			var itemName = selectedElement.getAttribute(kMenuNameAttr) || null;
			if (!itemName) { return; }
			
			switch(itemName) {
			case kMenuItemNameMOCSV: return this.onLayerMenuAddMovingObjectsCSVSelect();
			case kMenuItemNameMeshCSV: return this.onLayerMenuAddMeshCSVSelect();
			case kMenuItemNameDigitalTyphoon: return this.onLayerMenuAddDigitalTyphoon();
			}
		},
		
		onLayerMenuAddMovingObjectsCSVSelect: function() {
			this.requestAddLocalCSVLayer();
		},
		
		onLayerMenuAddMeshCSVSelect: function() {
			this.ownerApp.loadLocalCSVMeshData();
		},

		onLayerMenuAddDigitalTyphoon: function() {
			this.ownerApp.loadDigitalTyphoon();
		},
		
		// - - - - - - - - - - - - - - - - - - - - -

		generateWelcomeBox: function() {
			var hero_icon = $H('img');
			hero_icon.src = "../icons/icon-128.png";
			
			var box = $H('div');
			box.id = 'mm-layers-welcome';
			box.appendChild(hero_icon);

			var welcome_h = $H('h2');
			welcome_h.appendChild( $T('Welcome to Mobmap') );
			box.appendChild(welcome_h);
			
			
			var btnOpenService = this.setupDownloaderServiceButton();

			var abLocalMovCSV = this.generateWelcomeActionButton("images/mov-data-icon.png", "Moving Objects", "from Local CSV File");
			var abLocalMeshCSV = this.generateWelcomeActionButton("images/mesh-data-icon.png", "Mesh", "from Local CSV File");
			var abTyphoonJson = this.generateWelcomeActionButton("images/typhoon-data-icon.png", "Digital Typhoon", "from Web Page");
			$(abLocalMovCSV).click( this.onWelcomeLocalCSVClick.bind(this) );
			$(abLocalMeshCSV).click( this.onLoadMeshButtonClick.bind(this) );
			$(abTyphoonJson).click( this.onTyphoonButtonClick.bind(this) );
						
			var src_h = $H('header', 'mm-welcome-heading');
			src_h.appendChild($T('Select initial data.'));
			box.appendChild(src_h);
			
			var sources = $H('div', 'mm-welcome-sources');
			/*
			sources.appendChild(btnOpenService);
			*/
			sources.appendChild(abLocalMovCSV);
			sources.appendChild(abLocalMeshCSV);
			sources.appendChild(abTyphoonJson);
			box.appendChild(sources);

			this.containerElement.appendChild(box);
			return $(box);
		},
		
		generateWelcomeActionButton: function(iconURL, label1, label2) {
			var box = $H('div', 'mm-welcome-box-action');
			var labelElement1 = $H('span');
			labelElement1.appendChild( $T(label1) );
			var labelElement2 = $H('span');
			labelElement2.appendChild( $T(label2) );
			
			box.appendChild(labelElement1);
			box.appendChild(labelElement2);
			box.style.backgroundImage = 'url(' + iconURL + ')';
			
			return box;
		},
		
		setupDownloaderServiceButton: function() {
			var btn = $H('button', 'mm-data-service-button');
			btn.appendChild($T('Open Download Service'));
			
			//                         -----------------------------------vvvv
			$(btn).click( this.onDownloadServiceButtonClick.bind(this) ).hide();
			
			return btn;
		},

		onDownloadServiceButtonClick: function() {
			this.ownerApp.openDataDownloadService();
		},
		
		onLoadMeshButtonClick: function() {
			this.ownerApp.loadLocalCSVMeshData();
		},
		
		onTyphoonButtonClick: function() {
			this.ownerApp.loadDigitalTyphoon();
		},
		
		hideWelcomeBox: function() {
			this.jWelcomeBox.hide();
			this.jContainerElement.removeClass('welcome');
		},
		
		onWelcomeLocalCSVClick: function() {
			this.requestAddLocalCSVLayer();
		},
		
		requestAddLocalCSVLayer: function() {
			this.ownerApp.loadLocalCSVMovingData();
		},

		startSwapAnimation: function(i1, i2) {
			var dmy1 = document.createElement('span');
			var dmy2 = document.createElement('span');
			var elementList = $(this.itemsContainerElement).find('.mm-layer-view-item-box');
			var len = elementList.length;
			
			var el1 = elementList[len-1 - i1];
			var el2 = elementList[len-1 - i2];
			
			var j1 = $(el1);
			var j2 = $(el2);
			var up_d = j1.offset().top - j2.offset().top;
			var down_d = (j2.offset().top + j2.outerHeight() - j1.outerHeight()) - j1.offset().top;
			var parentNode = this.itemsContainerElement;
			
			j1.css('position', 'relative').animate({top: down_d}, 200);
			j2.css('position', 'relative').animate({top: up_d}, {
				duration: 200,
				complete: function() {
					// Reset position
					j1.css('position', 'static');
					j1.css('top', '');
					j2.css('position', 'static');
					j2.css('top', '');
					
					parentNode.replaceChild(dmy1, el1);
					parentNode.replaceChild(dmy2, el2);
					parentNode.replaceChild(el2, dmy1);
					parentNode.replaceChild(el1, dmy2);
				}
			});
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
					
					lv.updateSelectionCount();
					console.log("Needs view"); // This layer needs new view.
				}
				
				if (!layer._lvObserved) {
					layer._lvObserved = true;
					
					var LE = mobmap.LayerEvent;
					layer.eventDispatcher().
					 bind(LE.LoadWillStart, this.willStartLayerLoad.bind(this)).
					 bind(LE.LoadProgressChange, this.onLayerLoadProgressChange.bind(this, layer)).
					 bind(LE.LoadFinish, this.onLayerLoadFinish.bind(this)).
					 bind(LE.Destroy, this.onLayerDestroy.bind(this)).
					 bind(LE.VisibilityChange, this.onLayerVisibilityChange.bind(this, layer));
					
					if (layer.localSelectionPool) {
						layer.
						 localSelectionPool.
						 eventDispatcher().
						 bind(mobmap.SelectionPool.CHANGE_EVENT,
						      this.onLayerSelectionPoolChange.bind(this, layer));
					}
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
		},
		
		onLayerDestroy: function(e, layer) {
			if (layer.hasPrimaryView()) {
				layer.primaryView.removeSelf();
				layer.primaryView = null;
			}
		},

		onLayerSelectionPoolChange: function(layer, e) {
			if (layer.hasPrimaryView()) {
				layer.primaryView.updateSelectionCount();
			}
		},
		
		onLayerVisibilityChange: function(layer, e) {
			if (layer.hasPrimaryView()) {
				var hiddenStyle = !layer.visible;
				layer.primaryView.setVisibilityButtonHiddenStyle(hiddenStyle);
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
		this.meshPanel = null;
		
		this.visibilityButton = null;
		this.jSelCountIndicator = null;
		this.element = $H('div', 'mm-layer-view-item-box');
		this.jElement = $(this.element);
		this.build();
		
		this.layerReady = false;
	}
	
	LayerItemView.prototype = {
		build: function() {
			var use_marker = !!(this.boundLayer.capabilities & mobmap.LayerCapability.MarkerRenderable);
			var use_mesh = !!(this.boundLayer.capabilities & mobmap.LayerCapability.MeshRenderable);
			
			// Caption ---------------------
			var caption = $H('h3');
			caption.appendChild($T( this.makeLayerTypeString() ));

			var selCountEl = $H('span', 'mm-layer-view-selection-count');
			caption.appendChild(selCountEl);
			this.jSelCountIndicator = $(selCountEl);
			
			this.element.appendChild(caption);

			// Buttons on caption bar
			this.addCaptionButtons(caption);

			var sub_caption = $H('h4');
			sub_caption.appendChild($T('No data'));
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
			
			if (use_mesh) {
				this.buildMeshConfigurationPanel();
			}
		},
		
		removeSelf: function() {
			var parent = this.element.parentNode;
			if (parent) {
				parent.removeChild(this.element);
			}
		},
		
		addCaptionButtons: function(containerElement) {
			var img = $H('img', 'mm-layer-delete-button');
			img.src = 'images/delete-symbol.png';
			containerElement.appendChild(img);

			var v_btn = generateLayerVisibilityButton();
			containerElement.appendChild(v_btn.element);

			var img_down = $H('img', 'mm-layer-down-button');
			img_down.src = 'images/down-icon.png';
			containerElement.appendChild(img_down);

			var img_up = $H('img', 'mm-layer-up-button');
			img_up.src = 'images/up-icon.png';
			containerElement.appendChild(img_up);
			
			$(img).click(this.onLayerDeleteButtonClick.bind(this));
			$(img_down).click(this.onLayerDownButtonClick.bind(this));
			$(img_up).click(this.onLayerUpButtonClick.bind(this));
			v_btn.eventDispatcher().click(this.onLayerVisibilityButtonClick.bind(this));
			this.visibilityButton = v_btn;
		},

		makeLayerTypeString: function() {
			if (this.boundLayer.capabilities & mobmap.LayerCapability.MarkerRenderable) {
				return "Moving objects";
			} else {
				return "Mesh";
			}
		},
		
		buildMarkerConfigurationPanel: function() {
			this.markerPanel = new mobmap.MarkerConfigurationPanel(this.boundLayer.markerGenerator, this.boundLayer);
			this.markerPanel.hide();
			this.element.appendChild(this.markerPanel.element);
		},
		
		buildMeshConfigurationPanel: function() {
			this.meshPanel = new mobmap.MeshConfigurationPanel(this.boundLayer);
			this.meshPanel.hide();
			this.element.appendChild(this.meshPanel.element);
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
				if (this.markerPanel) { this.markerPanel.show(); }
				if (this.meshPanel) { this.meshPanel.show(); }
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
			
			mp.sendAttrNameToBind();
		},
		
		updateSelectionCount: function() {
			var lyr = this.boundLayer;
			if (!lyr) {return;}
			
			var n = 0;
			if (lyr.localSelectionPool) {
				n = lyr.localSelectionPool.count();
			}
			
			if (n > 0) {
				this.jSelCountIndicator.show().text(n);
			} else {
				this.jSelCountIndicator.hide();
			}
		},
		
		onLayerDeleteButtonClick: function() {
			this.boundLayer.requestDelete();
		},
		
		onLayerDownButtonClick: function() {
			this.boundLayer.requestGoDown();
		},
		
		onLayerUpButtonClick: function() {
			this.boundLayer.requestGoUp();
		},
		
		onLayerVisibilityButtonClick: function() {
			this.boundLayer.toggleVisibility();
		},
		
		setVisibilityButtonHiddenStyle: function (h) {
			this.visibilityButton.setSelectedStyle(h);
		}
	};

	function generateLayerVisibilityButton() {
		var btn = new mobmap.ToolButton("layer-visibility", 16, 15);
		btn.addClass('layer-visibility-toggle');
		return btn;
	}

	// +++ Export +++
	aGlobal.mobmap.LayersView = LayersView;
})(window);