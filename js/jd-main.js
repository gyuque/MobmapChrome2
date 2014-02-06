(function(aGlobal) {
	var gPrefPicker = null;
	
	// Launch
	window.onload = function() {
		var map_container = document.getElementById('pref-map-area');
		gPrefPicker = new PrefPicker(map_container);
		gPrefPicker.setMapSource(kMapData, afterImagesLoad);
	};
	
	function afterImagesLoad() {
		gPrefPicker.render();
	}



	function PrefPicker(map_container_el) {
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
			
			for (var nm in this.prefNameMap) {
				var item = this.prefNameMap[nm];
				this.renderPrefImage(g, item);
			}
		},
		
		renderPrefImage: function(g, prefItem) {
			g.drawImage(prefItem.image,
				this.mapOffsetX + prefItem.originX,
				this.mapOffsetY + prefItem.originY);
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
	}
	
	SelectionSet.prototype = {
		eventDispatcher: function() {
			return this.jEventElement;
		}
	};
	
	PrefItem.prototype.load = function() { this.image.src = this.sourceURL; };
})(window);