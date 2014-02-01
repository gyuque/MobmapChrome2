if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function MarkerConfigurationPanel(markerGenerator) {
		this.markerGenerator = markerGenerator;
		this.expandablePanel = new mobmap.ExpandablePanel();
		this.element = this.expandablePanel.element;
		this.expandablePanel.setTitle("Marker");
		
		this.configurePanelContent();
	}
	
	MarkerConfigurationPanel.prototype = {
		configurePanelContent: function() {
			var cc = this.expandablePanel.closedContentElement;
			cc.innerHTML = '';
			cc.appendChild( this.markerGenerator.previewCanvas );
			
			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';
			ec.appendChild( this.markerGenerator.resultCanvas );
			
			this.buildMarkerVaryOptions(ec);
		},
		
		buildMarkerVaryOptions: function(containerElement) {
			var fs = $H('fieldset');
			var lg = $H('legend');
			
			var rl_none = generateRadioInLabel('None',         'MarkerVaryType', 'varytypeopt');
			var rl_attr = generateRadioInLabel('By attribute', 'MarkerVaryType', 'varytypeopt');
			var rl_day  = generateRadioInLabel('By day',       'MarkerVaryType', 'varytypeopt');

			fs.appendChild( rl_none.label );
			fs.appendChild( rl_attr.label );
			fs.appendChild( rl_day.label );

			lg.appendChild( document.createTextNode('Varying') );
			fs.appendChild(lg);
			containerElement.appendChild(fs);
		},
		
		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};
	
	aGlobal.mobmap.MarkerConfigurationPanel = MarkerConfigurationPanel;
})(window);