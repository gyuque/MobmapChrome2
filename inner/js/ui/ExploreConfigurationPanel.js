if (!window.mobmap) { window.mobmap={}; }
// * * * Explore Layer Configuration * * *

(function(aGlobal) {
	'use strict';

	function ExploreConfigurationPanel(layer) {
		this.boundLayer = layer;

		this.expandablePanel = new mobmap.ExpandablePanel();
		this.expandablePanel.setTitle("Settings");
		this.element = this.expandablePanel.element;
		this.jElement = $(this.element);
		this.selectElementTargets = null;
		this.jSelectElementTargets = null;

		this.selectedTargetId = -1;
		this.configurePanelContent();
	}
	
	ExploreConfigurationPanel.prototype = {
		configurePanelContent: function() {
			var ec = this.expandablePanel.expandedContentElement;
			ec.innerHTML = '';
			this.buildExpandedPanelContent(ec);
		},
		
		buildExpandedPanelContent: function(containerElement) {
			var lab_sel = $H('label');
			lab_sel.appendChild( $T('Target:') );
			
			var sel = $H('select', 'mm-explore-target-select');
			lab_sel.appendChild(sel);
			containerElement.appendChild(lab_sel);

			this.selectElementTargets = sel;
			this.jSelectElementTargets = $(sel).change( this.onTargetSelectChange.bind(this) );
			this.addNoneTargetOption();
		},
		
		onTargetSelectChange: function() {
			var val = parseInt(this.jSelectElementTargets.val(), 10);
			this.boundLayer.setTargetLayerId(val);
		},

		setTargetList: function(targetLayerList) {
			this.clearTargetSelectItems();
			this.addNoneTargetOption();
			
			var len = targetLayerList.length;
			for (var i = 0;i < len;++i) {
				var targetInfo = targetLayerList[i];
		
				var opt = $H('option');
				opt.appendChild( $T(targetInfo.desc) );
				opt.value = targetInfo.id;
				this.selectElementTargets.appendChild(opt);
			}
			
			this.onTargetSelectChange();
		},
		
		addNoneTargetOption: function() {
			var opt = $H('option');
			opt.appendChild( $T('(None)') );
			opt.value = -1;
			
			this.selectElementTargets.appendChild(opt);
		},
		
		clearTargetSelectItems: function() {
			this.selectElementTargets.innerHTML = '';
		},
		
		show: function() { this.expandablePanel.show(); },
		hide: function() { this.expandablePanel.hide(); }
	};
	
	aGlobal.mobmap.ExploreConfigurationPanel = ExploreConfigurationPanel;
})(window);