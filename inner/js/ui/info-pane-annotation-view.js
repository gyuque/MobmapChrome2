if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function AnnotationListView(containerElement) {
		this.ownerApp = null;
		this.dataSource = null;
		this.newAnnotationId = null;
		// -----------------		
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);

		this.buildView(this.containerElement);
		this.observeEvents();
	}
	
	AnnotationListView.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
			this.observeApp();
			this.observeProject();
		},
		
		setNewAnnotationId: function(aid) {
			this.newAnnotationId = aid;
		},

		observeApp: function() {
			var ed = this.ownerApp.eventDispatcher();
			ed.bind(mobmap.Mobmap2App.PROJECT_SET_EVENT, this.onAppProjectSet.bind(this));
		},

		onAppProjectSet: function() {
			var prj = this.ownerApp.getCurrentProject();
			this.setAnnotationListSource(prj.annotationList);

			this.observeProject();
		},

		observeProject: function() {
			var prj = this.ownerApp.getCurrentProject();
			if (prj) {
				prj.eventDispatcher().bind(mobmap.MMAnnotationList.LIST_CHANGE, this.onListChange.bind(this));
			}
		},

		onListChange: function() {
			if (this.dataSource) {
				var ds = this.dataSource;
				this.dataSource.read();
			}
		},

		buildView: function(containerElement) {
			this.jContainerElement.kendoListView({
				template: this.generateAnnotationItemTemplate.bind(this)
			});
		},
		
		observeEvents: function() {
			this.jContainerElement.click( this.onContainerClick.bind(this) );
		},
		
		// Item HTML generator
		
		generateAnnotationItemTemplate: function(sourceItem) {
			var control = this.generateAnnotationItemControlArea(sourceItem);
			var html = this.generateAnnotationItemCommonHTML(sourceItem, control);
			
			if (sourceItem.id === this.newAnnotationId) {
				this.newAnnotationId = null;
				this.triggerHighlightAnimation(sourceItem.uid);
			}
			
			return html;
		},
		
		generateAnnotationItemCommonHTML: function(sourceItem, additional) {
			 return "<div data-uid=\"" +sourceItem.uid+ "\" class=\"mm-ann-view-item-box\"><h3>" +sourceItem.typeName+ "</h3> <div class=\"mm-ann-desc\"><span>" +mmEscapeHTML(sourceItem.description)+ "</span><input class=\"mm-ann-inline-edit\" type=\"text\"></div> <div class=\"mm-ann-content\">" +mmEscapeHTML(sourceItem.contentString)+ "</div> "+additional+" </div>"
		},

		generateAnnotationItemControlArea: function(sourceItem) {
			var buttonItems = [];
			
			if (sourceItem.typeId === AnnotationItemType.GATE) {
				buttonItems.push( this.generateAnnotationItemButton(sourceItem.id, 'images/annbtn-putgate.png', 'Put this gate', 'putgate') );
			}

			return "<div class=\"mm-ann-view-item-control\"> " +buttonItems.join(' ')+ " </div>";
		},

		generateAnnotationItemButton: function(aid, iconURL, title, commandId) {
			return '<img class="mm-ann-view-command-button" data-aid="' +aid+ '" data-command="' +commandId+ '" title="' +title+ '" src="' +iconURL+ '">';
		},

		triggerHighlightAnimation: function(uid) {
			var selector = '[data-uid=' +uid+ ']';
			var proc = function(b) {
				$(selector).css('box-shadow', b ? '0 0 2px 2px #4af' : '');
			};
			
			setTimeout(proc, 150, true);
			setTimeout(proc, 300, false);
			setTimeout(proc, 450, true);
			setTimeout(proc, 600, false);
		},


		getListViewObject: function() {
			return this.jContainerElement.data("kendoListView");
		},
		
		setAnnotationListSource: function(alist) {
			var ds = new kendo.data.DataSource({
			 data: alist.getRawList()
			});

			this.getListViewObject().setDataSource(ds);
			this.dataSource = ds;
		},
		
		onContainerClick: function(e) {
			var el = e.target;
			if (el) {
				var cmd = el.getAttribute('data-command');
				if (cmd && cmd.length > 0) {
					this.onCommandButtonClick(cmd, el);
				}
			}
		},
		
		onCommandButtonClick: function(commandName, buttonElement) {
			var aid = parseInt(buttonElement.getAttribute('data-aid'), 10);
			if (this.ownerApp) {
				this.ownerApp.invokeAnnotationCommand(aid, commandName);
			}
		}
	};

	// +++ Export +++
	aGlobal.mobmap.AnnotationListView = AnnotationListView;
})(window);