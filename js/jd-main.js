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
		this.mapWidth  = 400;
		this.mapHeight = 300;
		
		this.mapContainerElement = map_container_el;
		this.onImageReadyCallback = null;
		this.prefNameMap = {}
	}
	
	PrefPicker.prototype = {
		setMapSource: function(sourceData, callback) {
			this.onImageReadyCallback = callback;
			for (var nm in sourceData) {
				var dat = sourceData[nm];
				this.registerPrefecture(nm, dat.data);
			}
			
			this.loadAll();
		},

		registerPrefecture: function(name, imageURL) {
			var item = new PrefItem();
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
			
		}
	};
	
	function PrefItem() {
		this.image = null;
		this.sourceURL = null;
		this.loadComplete = false;
	}
	
	PrefItem.prototype.load = function() { this.image.src = this.sourceURL; };
})(window);