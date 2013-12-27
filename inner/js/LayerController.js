if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function LayerController() {
		this.mapOverlayList = [];
	}
	
	LayerController.prototype = {
		observeProject: function(prj) {
			prj.eventDispatcher().
			 bind(
				mobmap.MMProject.LAYERLIST_CHANGE,
				this.onProjectLayerlistChange.bind(this)
			 );
			
			this.checkLayerList(prj);
		},
		
		onProjectLayerlistChange: function(e, senderProject) {
			this.checkLayerList(senderProject);
		},
		
		checkLayerList: function(prj) {
			var ll = prj.layerList;
			var len = ll.getCount();
			
			for (var i = 0;i < len;++i) {
				var lyr = ll.getLayerAt(i);
				this.findMapOverlayFor(lyr);
			}
		},
		
		findMapOverlayFor: function(layerModel) {
			var i = this.mapOverlayList.indexOf(layerModel);
			console.log(i)
		}
	};

	aGlobal.mobmap.LayerController = LayerController;
})(window);