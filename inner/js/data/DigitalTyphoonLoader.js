if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function DigitalTyphoonLoader(targetLayer) {
		this.fileName = null;
		this.typhoonId = null;
		
		this.targetLayer = targetLayer;
		targetLayer.sourceLoader = this;
	}

	DigitalTyphoonLoader.prototype = {
		loadFromObject: function(geojsonObject) {
			this.fileName = geojsonObject.properties.display_name;
			this.typhoonId = parseInt( geojsonObject.properties.id , 10);
			
			var lyr = this.targetLayer;
			lyr.initTimeRange();
			lyr.newMovingData();
			lyr.eventDispatcher().trigger(mobmap.LayerEvent.LoadWillStart, lyr);
			
			this.readFeatures( geojsonObject.features );
			
			lyr.finishLoading();
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
			
			var props = featureSource.properties;
			var t = parseInt(props.time, 10);
			
			var record = mobmap.MovingData.createEmptyRecord();
			record._id   = this.typhoonId;
			record._time = t;
			record.x     = lng;
			record.y     = lat;
			
			this.targetLayer.registerNewMovingObjectRecord(record);
		}
	}
	
	aGlobal.mobmap.DigitalTyphoonLoader = DigitalTyphoonLoader;
})(window);