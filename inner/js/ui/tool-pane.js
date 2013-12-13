if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';

	function ToolPane(containerElement) {
		// Initialize - - - - - - - -
		this.ownerApp = null;
		this.layoutCell_TimeDisp = null;
		this.layoutCell_Timeline = null;
		this.jLayoutCell_Timeline = null;
		
		this.timelineBar = new mobmap.TimelineBar();
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);
		// - - - - - - - - - - - - - -
		this.setupWidgets();
	}
	
	ToolPane.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
		},

		observeContainerEvents: function(app3PanesView) {
			app3PanesView.eventDispatcher().bind(mobmap.Mobmap3PanesScreen.RESIZE_EVENT,
				this.onContainerResize.bind(this));
		},
		
		setupWidgets: function() {
			var l_tbl = this.buildLayoutTable();
			
			this.layoutCell_Timeline.appendChild( this.timelineBar.element );
			this.containerElement.appendChild( l_tbl );
		},
		
		buildLayoutTable: function() {
			var tbl = document.createElement('table');
			tbl.setAttribute('class', 'mm-tool-layout');
			var tr = document.createElement('tr');
			
			var td1 = document.createElement('td');
			var td2 = document.createElement('td');
			td1.setAttribute('class', 'mm-tool-layoutcell-timedisp');

			// Date and Time display text - - - - - - - - - -
			var spanDate = document.createElement('span');
			spanDate.setAttribute('class', 'mm-timeline-date-disp');
			spanDate.innerHTML = "1970-01-01";
			td1.appendChild(spanDate);
			
			var spanTime = document.createElement('span');
			spanTime.setAttribute('class', 'mm-timeline-time-disp');
			spanTime.innerHTML = "00:00:00";
			td1.appendChild(spanTime);
			// - - - - - - - - - - - - - - - - - - - - - - - -

			this.layoutCell_TimeDisp = td1;
			this.layoutCell_Timeline = td2;
			this.jLayoutCell_Timeline = $(this.layoutCell_Timeline);

			tr.appendChild(td1);
			tr.appendChild(td2);
			tbl.appendChild(tr);
			return tbl;
		},
		
		onContainerResize: function(e) {
			var cellWidth = this.jLayoutCell_Timeline.width();
			this.timelineBar.setWidth(cellWidth);
		}
	};
	
	aGlobal.mobmap.ToolPane = ToolPane;
})(window);