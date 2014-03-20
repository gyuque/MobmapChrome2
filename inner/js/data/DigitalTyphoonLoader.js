if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function DigitalTyphoonLoader(targetLayer) {
		this.targetLayer = targetLayer;
		targetLayer.sourceLoader = this;
	}

	DigitalTyphoonLoader.prototype = {
		loadFromObject: function(geojsonObject) {
			this.fileName = geojsonObject.properties.display_name;
			
			var lyr = this.targetLayer;
			lyr.newMovingData();
			lyr.eventDispatcher().trigger(mobmap.LayerEvent.LoadWillStart, lyr);
			
			this.readFeatures( geojsonObject.features );
		},
		
		readFeatures: function(featureList) {
			var len = featureList.length;
			for (var i = 0;i < len;++i) {
				var ft = featureList[i];
				this.addFeature(ft);
			}
		},
		
		addFeature: function(featureSource) {
			var g = featureSource.geometry;
			var lng = parseFloat(g.coordinates[0]);
			var lat = parseFloat(g.coordinates[1]);
			
			console.log(lat, lng)
		}
	}
	
	aGlobal.mobmap.DigitalTyphoonLoader = DigitalTyphoonLoader;
})(window);