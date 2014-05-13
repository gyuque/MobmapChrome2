if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	function AnnotationListView(containerElement) {
		this.ownerApp = null;
		// -----------------		
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);

		this.buildView(this.containerElement);
	}
	
	AnnotationListView.prototype = {
		setApp: function(a) {
			this.ownerApp = a;
			this.observeApp();
			this.observeProject();
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
			}
		},


		buildView: function(containerElement) {
			this.jContainerElement.kendoListView({
				template: "<div class=\"mm-ann-lv-item\">#:typeName#</div>"
			});
		},
		
		getListViewObject: function() {
			return this.jContainerElement.data("kendoListView");
		},
		
		setAnnotationListSource: function(alist) {
			var ds = new kendo.data.DataSource({
			 data: alist.getRawList()
			});

			this.getListViewObject().setDataSource(ds);
		}
	};

	// +++ Export +++
	aGlobal.mobmap.AnnotationListView = AnnotationListView;
})(window);