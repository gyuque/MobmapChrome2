if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function ExpandablePanel() {
		this.expanded = false;
		
		this.element = document.createElement('div');
		this.headingAreaElement = document.createElement('div');
		this.closedContentElement = document.createElement('div');
		this.expandedContentElement = document.createElement('div');
		
		this.element.appendChild(this.headingAreaElement);
		this.element.appendChild(this.closedContentElement);
		this.element.appendChild(this.expandedContentElement);

		this.jElement = $(this.element);
		this.jHeadingAreaElement = $(this.headingAreaElement);
		this.jClosedContentElement = $(this.closedContentElement);
		this.jExpandedContentElement = $(this.expandedContentElement);
		
		this.element.setAttribute('class', 'mm-expandable-panel-outer');
		this.headingAreaElement.setAttribute('class', 'mm-expandable-panel-heading');
		this.expandedContentElement.setAttribute('class', 'mm-expandable-panel-expanded');
		
		this.jHeadingAreaElement.click(this.onHeadingClick.bind(this));
		this.setExpanded(false);
	}
	
	ExpandablePanel.prototype = {
		hide: function() { this.jElement.hide(); },
		show: function() { this.jElement.show(); },
		
		setTitle: function(t) {
			this.jHeadingAreaElement.text(t);
		},

		onHeadingClick: function() {
			this.toggle();
		},
		
		toggle: function() {
			this.setExpanded( !this.expanded );
		},
		
		setExpanded: function(x) {
			this.expanded = x;
			if (this.expanded) {
				this.jElement.addClass('expanded');
			} else {
				this.jElement.removeClass('expanded');
			}
		} 
	};
	
	aGlobal.mobmap.ExpandablePanel = ExpandablePanel;
})(window);