(function(aGlobal) {
	'use strict';
	
	var gTL1 = null;
	
	function doWidgetTest() {
		gTL1 = new mobmap.TimelineBar();
		
		var container = document.getElementById('tl-container-1');
		container.appendChild(gTL1.element);
		
//		gTL1.
	}
	
	aGlobal.doWidgetTest = doWidgetTest;
})(window);