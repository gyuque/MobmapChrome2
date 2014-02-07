(function(aGlobal) {
	'use strict';
	var gPrefPicker = null;
	
	// Launch
	window.onload = function() {
		var map_container = document.getElementById('pref-map-area');
		gPrefPicker = new PrefPicker(map_container);
		gPrefPicker.setMapSource(kMapData, afterImagesLoad);
		
		gPrefPicker.observeCheckbox('.pchk-tokyo-core', '#selall-tokyo-core');
		gPrefPicker.observeCheckbox('.pchk-tokyo-around');
	};
	
	function afterImagesLoad() {
		gPrefPicker.render();
	}



	function PrefPicker(map_container_el) {
		this.selectionSet = new SelectionSet();
		this.selectionSet.eventDispatcher().bind(SelectionSet.CHANGE_EVENT, this.onSelectionSetChange.bind(this));
		this.boundCheckboxes = [];
		
		this.mapWidth  = 320;
		this.mapHeight = 360;
		
		this.mapOffsetX = -440;
		this.mapOffsetY = -70;
		
		this.mapCanvas  = null;
		this.mapG = null;
		this.mapContainerElement = map_container_el;
		this.onImageReadyCallback = null;
		this.prefNameMap = {}
		this.buildView();
	}
	
	PrefPicker.prototype = {
		buildView: function() {
			this.mapCanvas = document.createElement('canvas');
			this.mapG = this.mapCanvas.getContext('2d');
			
			this.mapCanvas.width = this.mapWidth;
			this.mapCanvas.height = this.mapHeight;
			this.mapContainerElement.appendChild(this.mapCanvas);
		},

		setMapSource: function(sourceData, callback) {
			this.onImageReadyCallback = callback;
			for (var nm in sourceData) {
				var dat = sourceData[nm];
				this.registerPrefecture(nm, dat.data, dat.originX, dat.originY);
			}
			
			this.loadAll();
		},

		registerPrefecture: function(name, imageURL, ox, oy) {
			var item = new PrefItem();
			
			item.originX = ox;
			item.originY = oy;
			
			item.image = new Image();
			item.image.onload = this.onItemImageLoadComplete.bind(this, item);
			item.sourceURL = imageURL;
			this.prefNameMap[name] = item;
		},
		
		onItemImageLoadComplete: function(prefItem) {
			prefItem.loadComplete = true;
			this.checkAllComplete();
		},

		loadAll: function() {
			for (var nm in this.prefNameMap) {
				this.prefNameMap[nm].load();
			}
		},

		checkAllComplete: function() {
			var not_ready_count = 0;
			
			for (var nm in this.prefNameMap) {
				if (!this.prefNameMap[nm].loadComplete) {
					++not_ready_count;
				}
			}
			
			if (not_ready_count === 0 && this.onImageReadyCallback) {
				this.onImageReadyCallback();
			}
		},
		
		render: function() {
			var g = this.mapG;
			g.clearRect(0, 0, this.mapWidth, this.mapHeight);
			
			for (var phase = 0;phase < 2;++phase) {
				var show_selected = (phase === 0);
				for (var nm in this.prefNameMap) {
					var item = this.prefNameMap[nm];
					var item_sel = this.selectionSet.isNameSelected(nm);
					if (show_selected === item_sel) {
						this.renderPrefImage(g, item);
					}
					
				}
				
				if (phase === 0) {
					this.filterCanvas();
				}
			}
		},
		
		renderPrefImage: function(g, prefItem) {
			g.drawImage(prefItem.image,
				this.mapOffsetX + prefItem.originX,
				this.mapOffsetY + prefItem.originY);
		},
		
		filterCanvas: function() {
			var w = this.mapWidth;
			var h = this.mapHeight;

			var g = this.mapG;
			var imagedata = g.getImageData(0, 0, w, h);
			var p = imagedata.data;
			var len = w * h;
			var pos = 0;
			for (var i = 0;i < len;++i) {
				p[pos] >>= 2;
				p[pos+1] >>= 1;
				pos += 4;
			}
			
			g.clearRect(0, 0, w, h);
			g.putImageData(imagedata, 0, 0);
		},
		
		observeCheckbox: function(chkSelector, selallSelector) {
			var ch = $(chkSelector);
			ch.click(this.onPrefCheckClick.bind(this));
			
			ch.each( (function(i,el){
				this.bindCheckbox(el);
			}).bind(this) );
			
			if (selallSelector) {
				this.setupBulkButton(selallSelector, ch, true);
			}
		},
		
		setupBulkButton: function(buttonSelector, targetList, value) {
			
		},
		
		bindCheckbox: function(inputElement) {
			if (this.boundCheckboxes.indexOf(inputElement) >= 0) {return;}
			
			this.boundCheckboxes.push(inputElement);
		},
		
		onPrefCheckClick: function(e) {
			this.sendCheckboxValues();
			this.selectionSet.fire();
		},
		
		onSelectionSetChange: function() {
			this.render();
		},
		
		sendCheckboxValues: function() {
			var ls = this.boundCheckboxes;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var el = ls[i];
				var chk = el.checked;
				var name = el.value;
				
				this.selectionSet.setSelected(name, chk);
			}
		}
	};
	
	function PrefItem() {
		this.image = null;
		this.sourceURL = null;
		this.loadComplete = false;
		this.originX = 0;
		this.originY = 0;
	}
	
	
	function SelectionSet() {
		this.jEventElement = $('body');
		this.nameMap = {};
	}
	
	SelectionSet.CHANGE_EVENT = "selset-changed";
	
	SelectionSet.prototype = {
		eventDispatcher: function() {
			return this.jEventElement;
		},
		
		setSelected: function(name, selected) {
			if (this.isNameSelected(name)) {
				if (!selected) {
					delete this.nameMap[name];
				}
			} else {
				if (selected) {
					this.nameMap[name] = true;
				}
			}
		},
		
		isNameSelected: function(prefName) {
			return this.nameMap.hasOwnProperty(prefName);
		},
		
		fire: function() {
			this.eventDispatcher().trigger(SelectionSet.CHANGE_EVENT, this);
		}
	};
	
	PrefItem.prototype.load = function() { this.image.src = this.sourceURL; };
})(window);