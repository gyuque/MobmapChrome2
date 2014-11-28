if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var ENABLE_POLYGON = true;
	var ENABLE_REMOTE_MOV = true;
	
	var kMenuNameAttr = "data-menuitem-name";
	var kMenuItemNameMOCSV = "add-movobjs-csv";
	var kMenuItemNameMeshCSV = "add-mesh-csv";
	var kMenuItemNameDigitalTyphoon = "add-digital-typhoon";
	var kMenuItemNamePolygonKML = "add-polygon-kml";

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
				ed.
				 bind(mobmap.MMProject.LAYERLIST_CHANGE, this.onLayerListChange.bind(this)).
				 bind(mobmap.MMProject.LAYERLIST_ORDER_SWAP, this.onLayerListOrderSwap.bind(this)).
				 bind(mobmap.MMProject.LAYERLIST_SWAP_FAIL, this.onLayerListSwapFail.bind(this)).
				 bind(mobmap.LayerEvent.LoadFinish, this.onAnyLayerLoadFinish.bind(this)).
				 bind(mobmap.LayerEvent.ExploreTargetSet, this.onAnyExploreLayerTargetSet.bind(this)).
				 bind(mobmap.LayerMarkerOptions.CHANGE_EVENT, this.onAnyLayerMarkerOptionChange.bind(this)).
				 bind(mobmap.MarkerGenerator.CHANGE_EVENT, this.onAnyLayerMarkerGeneratorChange.bind(this))
			}
		},

		onAppProjectSet: function() {
			this.observeProject();
		},
		
		onLayerListChange: function() {
			this.updateLayerViews();
			this.updateExploreTargets();
		},
		
		onAnyLayerLoadFinish: function() {
			this.updateExploreTargets();
		},
		
		onAnyExploreLayerTargetSet: function() {
			this.updateExploreLayerSubCaption();
		},
		
		onAnyLayerMarkerOptionChange: function(e, sourceMarkerOption, affectTrj) {
			if (affectTrj) {
				this.redrawExploreLayerIfUsingMarker(sourceMarkerOption);
			}
		},
		
		onAnyLayerMarkerGeneratorChange: function(e, sourceMarkerGenerator) {
			this.redrawExploreLayerIfUsingMarker(sourceMarkerGenerator);
		},
		
		onLayerListOrderSwap: function(e, layerList, i1, i2) {
			if (i1 > i2) {
				this.startSwapAnimation(i1, i2);
			} else {
				this.startSwapAnimation(i2, i1);
			}
		},

		onLayerListSwapFail: function(e, senderProject, layerIndex, moveDirection) {
			this.doSwapFailAnimation(layerIndex, moveDirection);
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
			
			this.addNewLayerMenuItem(ls_newLayers, 'Moving objects CSV', kMenuItemNameMOCSV);
			this.addNewLayerMenuItem(ls_newLayers, 'Mesh CSV'          , kMenuItemNameMeshCSV);
			this.addNewLayerMenuItem(ls_newLayers, 'Digital Typhoon'   , kMenuItemNameDigitalTyphoon);

			if (ENABLE_POLYGON) {
				this.addNewLayerMenuItem(ls_newLayers, 'Polygons KML', kMenuItemNamePolygonKML);
			}

			el.appendChild(li_add);
			this.containerElement.appendChild(el);
			return el;
		},
		
		addNewLayerMenuItem: function(parentList, labelText, itemName) {
			var li = $H('li');
			li.setAttribute(kMenuNameAttr, itemName);
			li.appendChild( $T(labelText) );
			parentList.appendChild(li);
		},
		
		// Layer menu handlers - - - - - - - - - - -
		
		onLayerMenuSelect: function(e) {
			var selectedElement = e.item;
			if (!selectedElement) {return;}
			
			var itemName = selectedElement.getAttribute(kMenuNameAttr) || null;
			if (!itemName) { return; }
			
			switch(itemName) {
			case kMenuItemNameMOCSV:          return this.onLayerMenuAddMovingObjectsCSVSelect();
			case kMenuItemNameMeshCSV:        return this.onLayerMenuAddMeshCSVSelect();
			case kMenuItemNameDigitalTyphoon: return this.onLayerMenuAddDigitalTyphoon();
			case kMenuItemNamePolygonKML:     return this.onLayerMenuAddPolygonsFromKML();
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
		
		onLayerMenuAddPolygonsFromKML: function() {
			this.ownerApp.loadPolygonsFromKML();
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
			var abRemoteMovCSV = null;
			var abLocalMeshCSV = this.generateWelcomeActionButton("images/mesh-data-icon.png", "Mesh", "from Local CSV File");
			var abTyphoonJson = this.generateWelcomeActionButton("images/typhoon-data-icon.png", "Digital Typhoon", "from Web Page");
			
			if (ENABLE_REMOTE_MOV) {
				abRemoteMovCSV = this.generateWelcomeActionButton("images/rmov-data-icon.png", "Moving Objects", "from Remote Server");
			}
			
			$(abLocalMovCSV).click( this.onWelcomeLocalCSVClick.bind(this) );
			$(abLocalMeshCSV).click( this.onLoadMeshButtonClick.bind(this) );
			$(abTyphoonJson).click( this.onTyphoonButtonClick.bind(this) );
			if (abRemoteMovCSV) {
				$(abRemoteMovCSV).click( this.onWelcomeRemoteCSVClick.bind(this) );
			}
						
			var src_h = $H('header', 'mm-welcome-heading');
			src_h.appendChild($T('Select initial data.'));
			box.appendChild(src_h);
			
			var sources = $H('div', 'mm-welcome-sources');
			/*
			sources.appendChild(btnOpenService);
			*/
			sources.appendChild(abLocalMovCSV);
			if (abRemoteMovCSV) { sources.appendChild(abRemoteMovCSV); }
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
		
		onWelcomeRemoteCSVClick: function() {
			this.requestAddRemoteCSVLayer();
		},
		
		requestAddLocalCSVLayer: function() {
			this.ownerApp.loadLocalCSVMovingData();
		},
		
		requestAddRemoteCSVLayer: function() {
			this.ownerApp.loadRemoteCSVMovingData();
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

		doSwapFailAnimation: function(layerIndex, moveDirection) {
			var elementList = $(this.itemsContainerElement).find('.mm-layer-view-item-box');
			var el = elementList[elementList.length-1 - layerIndex] || null;
			if (!el) { return; }
			
			var movePos = (moveDirection > 0) ? '-4px' : '4px';
			
			var j = $(el);
			j.css('position', 'relative').css('top', movePos).animate({top: 0}, {
				duration: 150,
				complete: function() {
					j.css('position', 'static');
					j.css('top', '');
				}
			});
		},

		// ------------------------------
		updateExploreTargets: function() {
			var prj = this.ownerApp.getCurrentProject();
			var ls = prj.layerList;
			var len = ls.getCount();
			var targetLayerList = [];
			var i, layer;
			
			// Make target list
			for (i = 0;i < len;++i) {
				layer = ls.getLayerAt(i);

				if (layer.capabilities & mobmap.LayerCapability.MarkerRenderable) {
					var lid = layer.layerId;
					var desc = layer.getShortDescription();
					
					targetLayerList.push({id:lid, desc:desc});
				}
			}
			
			// Send target list to explore layer
			for (i = 0;i < len;++i) {
				layer = ls.getLayerAt(i);
				if (layer.hasPrimaryView()) {
					if (layer.capabilities & mobmap.LayerCapability.ExploreOtherLayer) {
						layer.primaryView.setExploreTargetList(targetLayerList);
					}
				
					if (layer.capabilities & mobmap.LayerCapability.StatOtherLayer) {
						layer.primaryView.setStatTargetList(targetLayerList);
					}
				}
			}
		},
		
		updateExploreLayerSubCaption: function() {
			var prj = this.ownerApp.getCurrentProject();
			var ls = prj.layerList;
			var len = ls.getCount();
			for (var i = 0;i < len;++i) {
				var layer = ls.getLayerAt(i);
				if (!!(layer.capabilities & mobmap.LayerCapability.ExploreOtherLayer) &&
				       layer.hasPrimaryView()) {
					layer.primaryView.showExploreTargetName(
						this.findExploreTargetLayer(layer)
					);
				}
			}
		},
		
		redrawExploreLayerIfUsingMarker: function(sourceObject) {
			var prj = this.ownerApp.getCurrentProject();
			var ls = prj.layerList;
			var len = ls.getCount();
			for (var i = 0;i < len;++i) {
				var layer = ls.getLayerAt(i);
				if (layer.capabilities & mobmap.LayerCapability.ExploreOtherLayer) {
					var targetLayer = this.findExploreTargetLayer(layer);
					if (targetLayer && 
						(targetLayer._markerOptions === sourceObject ||
						 targetLayer.markerGenerator === sourceObject)) {
						layer.notifyMarkerOptionChanged();
					}
				}
			}
		},
		
		findExploreTargetLayer: function(exLayer) {
			var ls = this.ownerApp.getCurrentProject().layerList;

			var tid = exLayer.targetLayerId;
			if (tid >= 0) {
				return ls.getLayerById(tid);
			}
			
			return null;
		},
		
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
					
					var lv = new LayerItemView(layer, this.ownerApp);
					layer.primaryView = lv;
					this.appendLayerItemView(layer.primaryView,
						nextInView ? nextInView.primaryView : null);
					
					lv.updateSelectionCount();
					console.log("Needs view"); // This layer needs new view.
					
					// Explore layer doesn't have to load data.
					if (layer.capabilities & mobmap.LayerCapability.ExploreOtherLayer) {
						lv.setLayerReady(true);
					}
				}
				
				if (!layer._lvObserved) {
					layer._lvObserved = true;
					
					var LE = mobmap.LayerEvent;
					layer.eventDispatcher().
					 bind(LE.LoadWillStart, this.willStartLayerLoad.bind(this)).
					 bind(LE.BodyLoadStarted, this.onBodyLoadStarted.bind(this)).
					 bind(LE.LoadProgressChange, this.onLayerLoadProgressChange.bind(this, layer)).
					 bind(LE.LoadFinish, this.onLayerLoadFinish.bind(this)).
					 bind(LE.DataOptionChange, this.onLayerDataOptionChange.bind(this)).
					 bind(LE.DownloadError, this.onLayerDownloadError.bind(this)).
					 bind(LE.DownloadProgress, this.onLayerDownloadProgress.bind(this)).
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
				if (layer.remote) {
					layer.primaryView.showDownloadingLabel();
				}
				
				layer.primaryView.setSubCaption(layer.getShortDescription());
			}
		},
		
		onBodyLoadStarted: function(e, layer) {
			if (layer.remote && layer.hasPrimaryView()) {
				layer.primaryView.showLoadingLabel();
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
		
		onLayerDataOptionChange: function(e, layer) {
			if (layer.hasPrimaryView()) {
				layer.primaryView.syncRemainSidesCheckboxFromModel();
			}
		},
		
		onLayerDownloadError: function(e, layer) {
			if (layer.hasPrimaryView()) {
				layer.primaryView.showDownloadError();
			}
		},
		
		onLayerDownloadProgress: function(e, layer, loadedBytes) {
			if (layer.hasPrimaryView()) {
				layer.primaryView.showDownloadProgress(loadedBytes);
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
	function LayerItemView(layer, ownerApp) {
		this.boundLayer = layer;
		this.ownerApp = ownerApp;
		
		this.progressBar = null;
		this.progressLabel = null;
		this.subCaptionElement = null;
		this.remainSidesCheckbox = null;
		this.dataOffsetInput = null;
		this.markerPanel = null;
		this.connectionPanel = null;
		this.meshPanel = null;
		this.meshStatPanel = null;
		this.explorePanel = null;

		this.visibilityButton = null;
		this.jSelCountIndicator = null;
		this.jSelCountIndicatorText = null;
		this.element = $H('div', 'mm-layer-view-item-box');
		this.jElement = $(this.element);
		this.build();
		
		this.layerReady = false;
		this.acceptDownloadProgress = true;
		this.syncRemainSidesCheckboxFromModel();
	}
	
	LayerItemView.prototype = {
		build: function() {
			var use_marker  = !!(this.boundLayer.capabilities & mobmap.LayerCapability.MarkerRenderable);
			var use_polygon = !!(this.boundLayer.capabilities & mobmap.LayerCapability.PolygonRenderable);
			var use_mesh   = !!(this.boundLayer.capabilities & mobmap.LayerCapability.MeshRenderable);
			var use_exp    = !!(this.boundLayer.capabilities & mobmap.LayerCapability.ExploreOtherLayer);
			var no_updown = use_exp;
			
			// Caption ---------------------
			var caption = $H('h3');
			caption.appendChild($T( this.makeLayerTypeString() ));

			this.generateSelectionCountIndicator(caption);
			this.element.appendChild(caption);

			// Buttons on caption bar
			this.addCaptionButtons(caption, no_updown);

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
				this.buildDataOptions();
				this.buildMarkerConfigurationPanel();
				this.buildMarkerConnectionPanel();
			}
			
			if (use_mesh) {
				this.buildMeshConfigurationPanel();
			}
			
			if (use_exp) {
				this.buildExploreConfigurationPanel();
				this.setSubCaption("Select target layer");
			}
			
			if (this.boundLayer.remote) {
				this.addReloadButton(this.element);
			}
		},
		
		removeSelf: function() {
			var parent = this.element.parentNode;
			if (parent) {
				parent.removeChild(this.element);
			}
		},
		
		generateSelectionCountIndicator: function(containerElement) {
			var selCountEl = $H('span', 'mm-layer-view-selection-count');
			containerElement.appendChild(selCountEl);
			
			var tx = $H('span');
			selCountEl.appendChild(tx);

			var clearButton = $H('img', 'mm-layer-view-selection-clear');
			clearButton.src = "images/mini-x.png";
			selCountEl.appendChild(clearButton);

			this.jSelCountIndicator = $(selCountEl);
			this.jSelCountIndicatorText = $(tx);
			
			$(clearButton).click(this.onSelectionClearClick.bind(this));
		},
		
		addCaptionButtons: function(containerElement, noUpDown) {
			var img = $H('img', 'mm-layer-delete-button');
			img.src = 'images/delete-symbol.png';
			containerElement.appendChild(img);
			if (noUpDown) {
				$(img).addClass('disabled');
			} else {
				$(img).click(this.onLayerDeleteButtonClick.bind(this));
			}
			
			var v_btn = generateLayerVisibilityButton();
			containerElement.appendChild(v_btn.element);
			v_btn.eventDispatcher().click(this.onLayerVisibilityButtonClick.bind(this));
			this.visibilityButton = v_btn;

			if (noUpDown) {
				var img_no_updown = $H('img', 'mm-layer-no-up-down');
				img_no_updown.src = 'images/no-updown.png';
				containerElement.appendChild(img_no_updown);
			} else {
				var img_down = $H('img', 'mm-layer-down-button');
				img_down.src = 'images/down-icon.png';
				containerElement.appendChild(img_down);

				var img_up = $H('img', 'mm-layer-up-button');
				img_up.src = 'images/up-icon.png';
				containerElement.appendChild(img_up);

				$(img_down).click(this.onLayerDownButtonClick.bind(this));
				$(img_up).click(this.onLayerUpButtonClick.bind(this));
			}
		},
		
		addReloadButton: function(containerElement) {
			var buttonContainer = document.createElement('div');
			buttonContainer.setAttribute("class", "remote-refresh-button-container");
			
			var btn = document.createElement('button');
			buttonContainer.appendChild(btn);
			containerElement.appendChild(buttonContainer);
			btn.setAttribute("class", "remote-refresh-button");
			$(btn).text("Refresh").click( this.requestRemoteSourceRefresh.bind(this) );
		},
		
		requestRemoteSourceRefresh: function() {
			if (this.boundLayer.requestRemoteRefresh) {
				this.boundLayer.requestRemoteRefresh();
			}
		},

		makeLayerTypeString: function() {
			var caps = this.boundLayer.capabilities;
			if (caps & mobmap.LayerCapability.MarkerRenderable) {
				return "Moving objects";
			} else if (caps & mobmap.LayerCapability.ExploreOtherLayer) {
				return "Explore";
			} else if (caps & mobmap.LayerCapability.PolygonRenderable) {
				return "Polygon";
			} else {
				return "Mesh";
			}
		},

		// Moving data option UI

		buildDataOptions: function() {
			// Remain sides
			var pair = generateCheckboxInLabel('Remain before first/after last', 'mm-moving-data-option', 'mm-moving-data-option');
			this.element.appendChild(pair.label);
			
			this.remainSidesCheckbox = pair.input;
			$(pair.input).click( this.onRemainSidesCheckboxClick.bind(this) );
			
			// Offset
			var pair_days = generateInputElementInLabel('number', 'Offset ', 'mm-moving-data-offset', 'mm-moving-data-offset', true);
			pair_days.label.appendChild(document.createTextNode('day(s)'));
			this.configureOffsetNumberInput(pair_days.input);
			this.element.appendChild(pair_days.label);
			
			var ofs_handler = this.onDataOffsetInputChange.bind(this);
			this.dataOffsetInput = pair_days.input;
			$(pair_days.input).change(ofs_handler).keyup(ofs_handler);
		},
		
		configureOffsetNumberInput: function(input) {
			input.setAttribute('min', -99999);
			input.setAttribute('max', 99999);
			input.setAttribute('step', 1);
			input.setAttribute('value', 0);
		},

		getRemainSidesCheckboxValue: function() {
			if (!this.remainSidesCheckbox) {
				return false;
			}
			
			return !!(this.remainSidesCheckbox.checked);
		},
		
		setRemainSidesCheckboxValue: function(newValue) {
			if (!this.remainSidesCheckbox) { return; }

			newValue = !!(newValue);
			if (this.getRemainSidesCheckboxValue() !== newValue) {
				this.remainSidesCheckbox.checked = newValue;
			}
		},
		
		getDataOffsetInputValue: function() {
			if (!this.dataOffsetInput) {
				return 0;
			}
			
			return this.dataOffsetInput.value | 0;
		},
		
		setDataOffsetInputValueBySeconds: function(seconds) {
			var nDays = Math.floor(seconds / (24*3600));

			if (this.getDataOffsetInputValue() !== nDays) {
				this.dataOffsetInput.value = nDays;
			}
		},

		syncRemainSidesCheckboxFromModel: function() {
			if (this.boundLayer) {
				var val = !!(this.boundLayer.mdataRemainSides);
				this.setRemainSidesCheckboxValue(val);
				
				if (this.boundLayer.getDataOffset) {
					this.setDataOffsetInputValueBySeconds( this.boundLayer.getDataOffset() );
				}
			}
		},
		
		onRemainSidesCheckboxClick: function() {
			if (this.boundLayer && this.boundLayer.setRemainSides) {
				var val = this.getRemainSidesCheckboxValue();
				this.boundLayer.setRemainSides(val);
			}
		},
		
		onDataOffsetInputChange: function() {
			if (this.boundLayer && this.boundLayer.setDataOffset) {
				var val = this.getDataOffsetInputValue();
				this.boundLayer.setDataOffset(val * 24 * 3600);
			}
		},



		
		buildMarkerConfigurationPanel: function() {
			this.markerPanel = new mobmap.MarkerConfigurationPanel(this.boundLayer.markerGenerator, this.boundLayer);
			this.markerPanel.hide();
			this.element.appendChild(this.markerPanel.element);
		},
		
		buildMarkerConnectionPanel: function() {
			this.connectionPanel = new mobmap.MarkerConnectionSubPanel(this.boundLayer);
			this.connectionPanel.hide();
			this.element.appendChild(this.connectionPanel.element);
		},
		
		buildMeshConfigurationPanel: function() {
			this.meshPanel = new mobmap.MeshConfigurationPanel(this.boundLayer);
			this.meshPanel.hide();
			this.element.appendChild(this.meshPanel.element);
			
			this.meshStatPanel = new mobmap.MeshStatSubPanel(this.boundLayer);
			this.meshStatPanel.hide();
			this.element.appendChild(this.meshStatPanel.element);
		},
		
		buildExploreConfigurationPanel: function() {
			this.explorePanel = new mobmap.ExploreConfigurationPanel(this.boundLayer);
			this.explorePanel.hide();
			this.element.appendChild(this.explorePanel.element);
		},
		
		showExploreTargetName: function(targetLayer) {
			if (!targetLayer) {
				this.setSubCaption('No target set.');
			} else {
				this.setSubCaption('Exploring "' + targetLayer.getShortDescription() + '"');
			}
		},
		
		setSubCaption: function(label) {
			$(this.subCaptionElement).text(label);
		},
		
		showProgress: function(ratio) {
			this.progressBar.setRatio(ratio);
		},
		
		showDownloadError: function() {
			this.acceptDownloadProgress = false;
			this.progressLabel.className += ' mm-layer-dl-error';
			this.progressLabel.innerHTML = 'Download error';
		},
		
		hideProgress: function() {
			this.progressBar.hide();
			this.progressLabel.style.display = 'none';
		},
		
		showDownloadProgress: function(loadedBytes) {
			if (this.acceptDownloadProgress) {
				this.progressLabel.innerHTML = 'DL ' + makeLoadedBytesLabel(loadedBytes | 0);
			}
		},
		
		showLoadingLabel: function() {
			this.acceptDownloadProgress = false;
			this.progressLabel.innerHTML = 'Loading...';
		},
		
		showDownloadingLabel: function() { this.progressLabel.innerHTML = 'Downloading...'; },
		
		setLayerReady: function(r) {
			this.layerReady = r;
			this.toggleVisibilities();
		},
		
		toggleVisibilities: function() {
			if (this.layerReady) {
				this.hideProgress();
				if (this.markerPanel )     { this.markerPanel.show();      }
				if (this.connectionPanel ) { this.connectionPanel.show();  }
				if (this.meshPanel   )     { this.meshPanel.show();        }
				if (this.meshStatPanel)    { this.meshStatPanel.show();    }
				if (this.explorePanel)     { this.explorePanel.show();     }
			}
		},
		
		updateAdditionalPropertyList: function() {
			var mp = this.markerPanel;
			var cp = this.connectionPanel;
			if (!mp) {return;}

			mp.clearAdditionalPropertyList();
			mp.addPresetProperties();
			if (cp) { cp.clearAdditionalPropertyList(); }

			var lyr = this.boundLayer;
			if (!lyr) {return;}
			if (!lyr.dataReady) {return;}
			
			var mdat = lyr.movingData;
			mdat.forEachExtraProperty(function(attrName, flags){
				mp.addAdditionalPropertyName(attrName);
				if (cp) { cp.addAdditionalPropertyName(attrName); }
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
				this.jSelCountIndicator.show();
				this.jSelCountIndicatorText.text(n);
			} else {
				this.jSelCountIndicator.hide();
			}
		},
		
		setExploreTargetList: function(targetLayerList) {
			this.explorePanel.setTargetList(targetLayerList);
		},
		
		setStatTargetList: function(targetLayerList) {
			if (this.meshStatPanel) {
				this.meshStatPanel.setTargetList(targetLayerList);
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
		
		onSelectionClearClick: function() {
			if (this.boundLayer && this.boundLayer.localSelectionPool) {
				this.boundLayer.localSelectionPool.clear();
			}
		},
		
		setVisibilityButtonHiddenStyle: function (h) {
			this.visibilityButton.setSelectedStyle(h);
		}
	};

	function makeLoadedBytesLabel(n) {
		if (n < 10000) {
			return n + 'bytes';
		}
		
		return Math.floor(n / 1000) + 'KB';
	}

	function generateLayerVisibilityButton() {
		var btn = new mobmap.ToolButton("layer-visibility", 16, 15);
		btn.addClass('layer-visibility-toggle');
		return btn;
	}
	
	LayersView.generateOptionHeading = function(text) {
		var h = document.createElement('h5');
		h.setAttribute('class', 'mm-option-heading');
		h.appendChild( document.createTextNode(text) );
		return h;
	};

	// +++ Export +++
	aGlobal.mobmap.LayersView = LayersView;
})(window);