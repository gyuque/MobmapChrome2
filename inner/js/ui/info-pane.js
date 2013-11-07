if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function InfoPane(containerElement) {
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		this.tabList = new TabList(this.containerElement);
		this.prepareDefaultTabs();
		this.setupTabstrip();
	}

	InfoPane.prototype = {
		observeScreenResize: function(scr) {
			scr.eventDispatcher().bind(mobmap.Mobmap3PanesScreen.RESIZE_EVENT,
				this.afterScreenResize.bind(this));
		},
		
		prepareDefaultTabs: function() {
			this.tabList.add("Layers", "layers");
			this.tabList.add("Data", "data_detail");
		},

		setupTabstrip: function() {
			this.jContainerElement.kendoTabStrip({animation: false});
		},
		
		afterScreenResize: function() {
			var containerHeight = this.jContainerElement.height();
			var tabsHeight = this.tabList.jElement.height();
			
			var h = 0 | (containerHeight - tabsHeight);
			this.setBoxHeightAll(h-18);
		},

		setBoxHeightAll: function(h) {
			this.jContainerElement.find('.'+PANEBOX_CLASS).height(h);
		}
	};

	// List element manager
	function TabList(containerElement) {
		this.element = $H('ul', 'mm-info-pane-list');
		this.jElement = $(this.element);
		
		this.containerElement = containerElement;
		this.containerElement.appendChild(this.element);
	}
	
	TabList.prototype = {
		add: function(label, name) {
			var li = $H('li');
			li.appendChild( $T(label) );
			li.setAttribute('data-itemname', name);
			
			this.element.appendChild(li);
			generateTabbedBox(this.containerElement, name);
			
			return li;
		},
		
		removeByName: function(name) {
			var ls = this.element.childNodes;
			var len = ls.length;
			for (var i = 0;i < len;++i) {
				var el_nm = ls[i].getAttribute('data-itemname');
				if (el_nm === name) {
					// XXX
				}
			}
		}
	};
	
	function generateTabbedBox(container, name) {
		var box = $H('div', PANEBOX_CLASS);
		box.setAttribute('data-itemname', name);
		container.appendChild(box);
	}

	var PANEBOX_CLASS = 'mm-info-pane-box';
	// +++ Export +++
	aGlobal.mobmap.InfoPane = InfoPane;
})(window);