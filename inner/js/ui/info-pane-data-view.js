if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var kShortTableLimit = 100;
	var kEnableExport = true;

	function DataDetailView(containerElement) {
		this.ownerApp = null;
		this.dataSourceForGrid = null;
		this.gridOuterElement = null;
		this.jGridOuterElement = null;
		this.jCollapseWarning = null;
		this.jTableTitle = null;
		this.jTitleContainer = null;
		this.jExpressionInputBox = null;
		this.targetSelectElement = null;
		this.currentTargetId = -1;
		this.forceShowAll = false;
		this.nowShowingSelectedOnly = false;
		// -----------------
		this.exsearchExpandablePanel = new mobmap.ExpandablePanel();
		this.valfillExpandablePanel = new mobmap.ExpandablePanel();
		this.a_addExpandablePanel = new mobmap.ExpandablePanel();
		this.jValFillButton = null;
		this.jAddAttributeButton = null;
		this.valfillInputElement = null;
		this.valfillSelectElement = null;
		this.a_addNameInputElement = null;
		this.dataSourceArray = [];
		this.containerElement = containerElement;
		this.jContainerElement = $(containerElement);

		this.buildView();
	}
	
	DataDetailView.prototype = {
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
			this.observeProject();
		},

		observeProject: function() {
			var prj = this.ownerApp.getCurrentProject();
			if (prj) {
				var ed = prj.eventDispatcher();
				ed.
				 bind(mobmap.MMProject.LAYERLIST_CHANGE, this.onLayerListChange.bind(this)).
				 bind(mobmap.LayerEvent.LoadFinish, this.onAnyLayerLoadFinish.bind(this));
			}
		},

		onAnyLayerLoadFinish: function() {
			this.onLayerListChange();
		},

		onLayerListChange: function() {
			var prj = this.ownerApp.getCurrentProject();
			
			this.clearTargetSelect();
			if (prj) {
				this.fillTargetSelect(prj.getLayerList());
			}
			
			this.fetchTargetSelectValue();
			this.updateValFillAttrSelection();
		},

		buildView: function() {
			this.dataSourceForGrid = new kendo.data.DataSource({data: this.dataSourceArray});
			this.addCollapseDisp( this.containerElement );
			this.addTargetSelector( this.containerElement );
			this.setupExpressionSearchPanel( this.containerElement );
			this.setupValueFillPanel( this.containerElement );
			this.setupAddAttributePanel( this.containerElement );
			this.addTableTitle( this.containerElement );
			
			this.gridOuterElement = $H('div', 'mm-data-grid-outer');
			this.jGridOuterElement = $(this.gridOuterElement).click( this.onClickInsideGrid.bind(this) );
			this.containerElement.appendChild(this.gridOuterElement);
			this.jGridOuterElement.kendoGrid({
				detailTemplate: this.generateRowDetailBox.bind(this)
			});
			
			var gr = this.getDataGridObject();
			gr.setDataSource(this.dataSourceForGrid);
		},
		
		setupExpressionSearchPanel: function(containerElement) {
			this.exsearchExpandablePanel.setTitle("Query by expression");
			containerElement.appendChild(this.exsearchExpandablePanel.element);
			
			this.exsearchExpandablePanel.closedContentElement.innerHTML = '';

			var ec = this.exsearchExpandablePanel.expandedContentElement;
			ec.innerHTML = '';
			var tx = $H('textarea', 'mm-query-expression-input');
			this.jExpressionInputBox = $(tx);
			ec.appendChild(tx);

			var buttonContainer = $H('div', 'mm-query-expression-buttons-container');
			var btn = $H('button');
			btn.appendChild( $T('Run query') );
			buttonContainer.appendChild(btn);
			ec.appendChild(buttonContainer);
			$(btn).click( this.onRunExpressionQueryButtonClick.bind(this) );
		},
		
		setupValueFillPanel: function(containerElement) {
			this.valfillExpandablePanel.setTitle("Value fill");
			containerElement.appendChild(this.valfillExpandablePanel.element);
			this.valfillExpandablePanel.closedContentElement.innerHTML = '';
			
			var ec = this.valfillExpandablePanel.expandedContentElement;
			ec.innerHTML = '';
			var valInput = $H('input', 'mm-valfill-value');
			valInput.size = 8;
			var selAttr = $H('select');
			var btn = $H('button');
			
			ec.appendChild(selAttr);
			ec.appendChild($T('='));
			ec.appendChild(valInput);
			ec.appendChild($T(' '));
			ec.appendChild(btn);

			this.jValFillButton = $(btn).text('fill').click( this.onValueFillButtonClick.bind(this) );
			this.valfillSelectElement = selAttr;
			this.valfillInputElement = valInput;
		},
		
		setupAddAttributePanel: function(containerElement) {
			var xp = this.a_addExpandablePanel;
			xp.setTitle("Add attribute");
			containerElement.appendChild(xp.element);
			xp.closedContentElement.innerHTML = '';
			
			var ec = xp.expandedContentElement;
			ec.innerHTML = '';
			
			var attrNameInput = $H('input', 'mm-addattrform-name');
			attrNameInput.type = 'text';
			var lab = $H('label', 'mm-addattrform-label');
			lab.innerHTML = 'Name ';
			lab.appendChild(attrNameInput);
			ec.appendChild(lab);
			this.a_addNameInputElement = attrNameInput;


			var labInitialValue = $H('label', 'mm-addattrform-label');
			labInitialValue.innerHTML = 'Initial value';
			ec.appendChild(labInitialValue);
			this.generateAttributeInitialValueForm(ec);
			
			var buttonContainer = $H('div', 'mm-addattrform-button-container');
			var trigger = document.createElement('button');
			trigger.innerHTML = 'Add';
			buttonContainer.appendChild(trigger);
			ec.appendChild(buttonContainer);
			
			this.jAddAttributeButton = $(trigger).click(this.onAddAttributeButtonClick.bind(this));
		},
		
		generateAttributeInitialValueForm: function(containerElement) {
			var pair_z = generateRadioInLabel('Zero or Empty', 'mm-addattrform-inittype', 'mm-addattrform-inittype'); 
			
			containerElement.appendChild(pair_z.label);
		},
		
		onRunExpressionQueryButtonClick: function() {
			var selc = this.ownerApp.getSelectionController();
			var tid = this.currentTargetId;
			var ex  = this.jExpressionInputBox.val();
			
			selc.doExpressionSelection(tid, ex); 
		},
		
		generateRowDetailBox: function(item) {
			var gateOptionBox = '';
			var count = this.generateRowDetailRecordsCount(item._id);
			var velo  = this.generateRowDetailVelocity(item);
			var buttons = 
			 this.generateDetailRowButton('reveal', item, 'images/drowbtn-reveal.png', 'Reveal on map') +
			 this.generateDetailRowButton('only', item, 'images/drowbtn-only.png', 'Select this only');
			
			if (this.nowShowingSelectedOnly) {
				buttons += this.generateDetailRowButton('deselect', item, 'images/drowbtn-remove.png', 'Deselect this');
			}
			
			if (this.hasCurrentSourceLayerPolygonOperation()) {
				buttons += this.generateDetailRowButton('rungate', item, 'images/drowbtn-rungate.png', 'Run gate');
				gateOptionBox = '<div class="mm-drow-gate-option-box" style="display:none"><img src="images/drow-option-a.png" alt="" class="mm-drow-option-a">' +
				                  this.generateGateOptionBuuttons(item) + '</div>';
			}
			
			
			return '<div class="mm-datatable-detail-box">'+ count+velo+buttons+ gateOptionBox +'</div>';
		},
		
		generateGateOptionBuuttons: function(item) {
			var container = $H('div');
			var tbl = $H('table', 'mm-polygon-gate-table');
			var tbody = $H('tbody');
			var tr = $H('tr');

			container.appendChild(tbl);
			tbl.appendChild(tbody);
			tbody.appendChild(tr);

			function makebtn(label, cmd) {
				return '<td><button class="mm-polygon-gate-type-button" data-command="' +cmd+ '" data-objid="' +item._id+ '">' +label+ '</button></td>';
			}
			
			var tr2 = $H('tr');
			tbody.appendChild(tr2);
			var td_exp = $H('td');
			td_exp.colSpan = 2;
			tr2.appendChild(td_exp);
			td_exp.innerHTML = '<label><input type="checkbox" class="mm-polygon-gate-condition-check">Condition:</label> <input type="text" class="mm-polygon-gate-condition-exp" placeholder="age&lt;50" disabled="disabled">';

			tr.innerHTML = makebtn('Points + edges', 'rungate-e') + makebtn('Record points only', 'rungate-p');

			return container.innerHTML;
		},
		
		generateRowDetailRecordsCount: function(objId) {
			var n = 0;
			var sourceLayer = this.getCurrentSourceLayer();
			if (sourceLayer) {
				if (!(sourceLayer.capabilities & mobmap.LayerCapability.MarkerRenderable)) {
					// Not supported for this layer
					return '';
				}
				
				var tl = sourceLayer.movingData.getTimeListOfId(objId);
				if (tl) {
					n = tl.getRecordList().length;
				}
			}
			
			return '<div class="mm-datatable-detail-mini-info">' +n+ ' records</div>' ;
		},
		
		generateRowDetailVelocity: function(item) {
			var mPerSec = 0;
			var dispV1 = '0';
			var dispV2 = '0';
			
			var sourceLayer = this.getCurrentSourceLayer();
			if (sourceLayer) {
				if (!(sourceLayer.capabilities & mobmap.LayerCapability.MarkerRenderable)) {
					// Not supported for this layer
					return '';
				}
				if (item._backKeyTime && item._fwdKeyTime) {
					var rec1 = sourceLayer.movingData.getKeyFrameRecord(item._id, item._backKeyTime);
					var rec2 = sourceLayer.movingData.getKeyFrameRecord(item._id, item._fwdKeyTime);
					
					var etime = item._fwdKeyTime - item._backKeyTime;
					var distance = calcDistanceFromLatLng(rec1.x, rec1.y, rec2.x, rec2.y);
					if (etime) {
						mPerSec = distance / etime;
						dispV1 = mPerSec.toFixed(1);
						dispV2 = (mPerSec * 3600.0 / 1000.0).toFixed(1);
					}
				}
			}
			
			return '<div class="mm-datatable-detail-mini-info">' +dispV1+ ' m/s (' +dispV2+ ' km/h)</div>' ;
		},
		
		getCurrentSourceLayer: function() {
			if (!this.ownerApp) { return null; }

			var prj = this.ownerApp.getCurrentProject();
			if (!prj) { return null; }
			
			return prj.getLayerById(this.currentTargetId);
		},
		
		hasCurrentSourceLayerPolygonOperation: function() {
			var lyr = this.getCurrentSourceLayer();
			if (!lyr) { return false; }
			
			return !!(lyr.capabilities & mobmap.LayerCapability.PolygonSelectable);
		},
		
		generateDetailRowButton: function(commandName, boundItem, iconURL, title) {
			return '<img class="mm-detail-row-command-button" data-command="' +commandName+ '" data-lat="' +boundItem.y+ '" data-lng="' +boundItem.x+ '" data-objid="' +boundItem._id+ '" title="' +title+ '" src="' +iconURL+ '">';
		},

		addCollapseDisp: function(contaierElement) {
			var div = $H('div', 'mm-datatable-collapse-warning');
			contaierElement.appendChild(div);

			this.jCollapseWarning = $(div).hide().click(this.onCollapseWarningClick.bind(this));
		},
		
		addTableTitle: function(containerElement) {
			var con = $H('div', 'mm-datatable-title-container');
			var h = $H('h3', 'mm-datatable-title');

			this.jTableTitle = $(h);
			this.jTitleContainer = $(con).hide();
			con.appendChild(h);
			containerElement.appendChild(con);
			
			this.addTitleAreaButton(con);
		},
		
		addTitleAreaButton: function(containerElement) {
			this.generateTitleAreaButton(
				containerElement,
				"images/drowbtn-add.png",
				"Add to annotations",
				this.onAddSelectionToAnnotationClick.bind(this), false);

			if (kEnableExport) {
				this.generateTitleAreaButton(
					containerElement,
					"images/drowbtn-export.png",
					"Export",
					this.onExportButtonClick.bind(this), true);
			}
		},
		
		generateTitleAreaButton: function(containerElement, iconURL, title, closure, second) {
			var cls = 'mm-datatable-ontitle-button';
			if (second) {
				cls += ' mm-datatable-ontitle-button-i2';
			}

			var img = $H('img', cls);
			img.src = iconURL;
			img.title = title;
			$(img).click( closure );
			containerElement.appendChild(img);
		},
		
		hideTitleAreaButton: function() { $('.mm-datatable-ontitle-button').hide(); },
		showTitleAreaButton: function() { $('.mm-datatable-ontitle-button').show(); },
		
		updateTitleButtonsState: function() {
			var show = false;

			var lyr = this.getCurrentSourceLayer();
			if (lyr && (lyr.capabilities & mobmap.LayerCapability.SpatialSelectable)) {
				show = true;
			}
			
			if (show) {
				this.showTitleAreaButton();
			} else {
				this.hideTitleAreaButton();
			}
		},
		
		updateTableTitle: function(sel_enabled, n) {
			if (sel_enabled) {
				var postfix = (n > 1) ? ' selected objects' : ' selected object';
				this.jTableTitle.text(n + postfix);
				this.jTitleContainer.show();
			} else {
				this.jTitleContainer.hide();
			}
		},
		
		showCollapseWarning: function(nAll) {
			var msg = 'Showing cut-off table. Click here to show all '+ nAll + ' rows.';
			this.jCollapseWarning.text(msg).show();
		},
		
		onCollapseWarningClick: function() {
			this.forceShowAll = true;
			this.requestRedraw();
			this.updateStaticLayerDataView();
			this.forceShowAll = false;
		},
		
		hideCollapseWarning: function() {
			this.jCollapseWarning.hide();
		},

		addTargetSelector: function(containerElement) {
			var lab = $H('label', 'mm-data-view-target-selector-label');
			var sel = $H('select');
			
			lab.appendChild( $T('Layer: ') );
			lab.appendChild( sel );
			
			containerElement.appendChild(lab);
			this.targetSelectElement = sel;

			$(sel).change( this.onTargetSelectChange.bind(this) );
		},

		getDataGridObject: function() {
			return this.jGridOuterElement.data("kendoGrid");
		},
		
		clearTargetSelect: function() {
			this.targetSelectElement.innerHTML = '';
		},
		
		fillTargetSelect: function(layerList) {
			var len = layerList.getCount();
			for (var i = 0;i < len;++i) {
				var layer = layerList.getLayerAt(i);
				if ( this.canLayerBeTarget(layer) ) {
					var desc = layer.getShortDescription();
					
					var op = $H('option');
					op.appendChild( $T(desc) );
					op.value = layer.layerId;
					
					this.targetSelectElement.appendChild(op);
				}
			}
		},
		
		canLayerBeTarget: function(layer) {
			var c = layer.capabilities;
			return !!(c & mobmap.LayerCapability.MarkerRenderable) || !!(c & mobmap.LayerCapability.PolygonSelectable);
		},
		
		// Update data
		
		notifyMovingDataPicked: function(sourceLayer, pickedArray, count) {
			var nToShow = count;
			if (sourceLayer.layerId !== this.currentTargetId) {
				return;
			}
			
			var any_selected = false;
			var sel_count = 0;
			var selp = sourceLayer.localSelectionPool;
			if (selp.isAnySelected()) {
				any_selected = true;
				sel_count = selp.count();
				nToShow = sel_count;
			}
			
			if (!this.forceShowAll && nToShow > kShortTableLimit) {
				this.showCollapseWarning(nToShow);
				nToShow = kShortTableLimit;
			} else {
				this.hideCollapseWarning();
			}

			// Refer records
			var i;
			var arr = this.dataSourceArray;
			arr.length = nToShow;
			
			if (!any_selected) {
				for (i = 0;i < nToShow;++i) {
					arr[i] = pickedArray[i];
				}
			} else {
				var wroteCount = 0;
				for (i = 0;i < count;++i) {
					var srcRecord = pickedArray[i];
					if (selp.isIDSelected(srcRecord._id)) {
						arr[wroteCount++] = srcRecord;
					}
					
					if (wroteCount >= nToShow) {
						break;
					}
				}
			}
			
			this.nowShowingSelectedOnly = any_selected;
			this.updateTableTitle(any_selected, sel_count);
			this.dataSourceForGrid.read();
			
			var gr = this.getDataGridObject();
			gr.hideColumn("_pickIndex");
			gr.hideColumn("_pickTime");
			gr.hideColumn("_backKeyTime");
			gr.hideColumn("_fwdKeyTime");

			gr.showColumn("x");
			gr.showColumn("y");
			gr.showColumn("_time");
//			console.log("renew", count)
		},
		
		updateStaticLayerDataView: function() {
			var prj = this.ownerApp.getCurrentProject();
			if (!prj) {return;}
			
			var targetLayer = prj.getLayerById(this.currentTargetId);
			if (targetLayer.capabilities & mobmap.LayerCapability.StaticData) {
				// Static data layer
				
				if (targetLayer.capabilities & mobmap.LayerCapability.PolygonSelectable) {
					this.updateTableFromStaticPolygon(targetLayer);
				}
				
			}
		},
		
		updateTableFromStaticPolygon: function(targetLayer) {
			var polygonDataSource = targetLayer.getPolygonDataSource();
			var allCount = polygonDataSource.getNumOfPolygons();
			var nToShow = allCount;


			var any_selected = false;
			var sel_count = 0;
			var selp = targetLayer.localSelectionPool;
			if (selp.isAnySelected()) {
				any_selected = true;
				sel_count = selp.count();
				nToShow = sel_count;
			}


			if (!this.forceShowAll && nToShow > kShortTableLimit) {
				this.showCollapseWarning(nToShow);
				nToShow = kShortTableLimit;
			} else {
				this.hideCollapseWarning();
			}
						
			
			// Refer records
			var i;
			var arr = this.dataSourceArray;
			arr.length = nToShow;
			var wroteCount = 0;
			for (i = 0;i < allCount;++i) {
				var pg = polygonDataSource.getPolygonAt(i);
				if (any_selected) {
					if (!selp.isIDSelected(pg.getId())) {
						continue;
					}
				}
				
				arr[wroteCount++] = pg.getAttributesMap();

				if (wroteCount >= nToShow) {
					break;
				}
			}

			this.nowShowingSelectedOnly = any_selected;
			this.updateTableTitle(any_selected, sel_count);
			this.dataSourceForGrid.read();

			var gr = this.getDataGridObject();
			gr.hideColumn("x");
			gr.hideColumn("y");
			gr.hideColumn("_time");
		},
		
		onClickInsideGrid: function(e) {
			if (e.target) {
				var j = $(e.target);
				
				var cmd = e.target.getAttribute('data-command');
				if (cmd && cmd.length > 0) {
					this.execDetailBoxCommand(cmd, e.target);
				} else {
					if (j.hasClass('mm-polygon-gate-condition-check')) {
						this.onPolygonGateConditionCheckClick(e.target);
					}
				}
			}
		},
		
		execDetailBoxCommand: function(cmdName, sourceElement) {
			var oid = sourceElement.getAttribute('data-objid');

			var enable_cond = false;
			var expressionObject = null;
			if (cmdName === 'rungate-e' || cmdName === 'rungate-p') {
				enable_cond = this.getPolygonGateConditionEnabled(sourceElement);
				if (enable_cond) {
					expressionObject = new mobmap.ExpressionQuery();
					expressionObject.parse( this.getPolygonGateConditionExpressionText(sourceElement) );
					
					if (expressionObject.hasError || !(expressionObject.rootNode)) {
						this.showPolygonGateExpressionError(sourceElement);
						return;
					}
				}
			}

			switch(cmdName) {
				case 'reveal': {
					if (this.ownerApp) {
						var lat = parseFloat( sourceElement.getAttribute('data-lat') );
						var lng = parseFloat( sourceElement.getAttribute('data-lng') );
						var mp = this.ownerApp.getMapPane();
						mp.showAimingMarker(lat, lng);
						mp.panTo(lat, lng);
					}
					break;
				} 
			
				case 'deselect': {
					this.deselectId(oid);
					break;
				}
		
				case 'only': {
					this.selectOneId(oid);
					break;
				}

				case 'rungate': {
					this.toggleGateOptionBox(sourceElement);
					break;
				}
				
				case 'rungate-e': {
					this.runGateBy(oid, false, expressionObject);
					break;
				}
				
				case 'rungate-p': {
					this.runGateBy(oid, true, expressionObject);
					break;
				}
			}
		},
		
		getPolygonGateConditionEnabled: function(originElement) {
			var chk = this.findPolygonGateOptionInputElement(originElement, '.mm-polygon-gate-condition-check');
			if (!chk) { return false; }

			return chk.checked;
		},

		getPolygonGateConditionExpressionText: function(originElement) {
			var tx = this.findPolygonGateOptionInputElement(originElement, '.mm-polygon-gate-condition-exp');
			if (!tx) { return ''; }
			
			return tx.value;
		},

		findPolygonGateOptionInputElement: function(originElement, selector) {
			var tbl = mmFindParentByTagName(originElement, 'table');
			if (!tbl) { return null; }

			return $(tbl).find(selector)[0] || null;
		},

		onPolygonGateConditionCheckClick: function(sourceElement) {
			var tx = this.findPolygonGateOptionInputElement(sourceElement, '.mm-polygon-gate-condition-exp');
			if (tx) {
				tx.disabled = !(sourceElement.checked);
			}
		},

		showPolygonGateExpressionError: function(sourceElement) {
			var tx = this.findPolygonGateOptionInputElement(sourceElement, '.mm-polygon-gate-condition-exp');
			if (tx) {
				tx.style.backgroundColor = '#f00';
				setTimeout(function(){ tx.style.backgroundColor = ''; }, 300);
			}
		},


		deselectId: function(objId) {
			var lyr = this.getCurrentSourceLayer();
			if (lyr && lyr.localSelectionPool) {
				lyr.localSelectionPool.removeId(objId);
			}
		},
		
		selectOneId: function(objId) {
			var lyr = this.getCurrentSourceLayer();
			if (lyr && lyr.localSelectionPool) {
				lyr.localSelectionPool.clear(true);
				lyr.localSelectionPool.addId(objId);
			}
		},
		
		toggleGateOptionBox: function(sourceElement) {
			$(sourceElement.parentNode).find('.mm-drow-gate-option-box').toggle();
		},
		
		runGateBy: function(objId, pointIncOnly, expressionQueryObject) {
			if (this.hasCurrentSourceLayerPolygonOperation()) {

				var layer = this.getCurrentSourceLayer();
				var pgDataSource = layer.getPolygonDataSource();
				var gatePolygon = pgDataSource.findPolygonById(objId);

				if (gatePolygon) {
					this.ownerApp.showGateBusyDialog();
					var tester = new mobmap.PolygonGateTester(gatePolygon, pointIncOnly);
				
					if (expressionQueryObject) {
						tester.setExpressionQuery(expressionQueryObject);
					}
				
					this.
					 ownerApp.
					 getSelectionController().
					 runGateSelectionWithTestProvider(tester);
				}
			}
		},
		
		onTargetSelectChange: function() {
			this.fetchTargetSelectValue();
			this.updateValFillAttrSelection();
			
			this.updateStaticLayerDataView();
			this.updateTitleButtonsState();
		},
		
		fetchTargetSelectValue: function() {
			var v = parseInt(this.targetSelectElement.value);
			if (this.currentTargetId !== v) {
				this.currentTargetId = v;
				this.requestRedraw();
			}
		},
		
		requestRedraw: function() {
			if (this.ownerApp) {
				this.ownerApp.redrawMap();
			}
		},
		
		updateValFillAttrSelection: function() {
			var lyr = this.getCurrentSourceLayer();
			this.valfillSelectElement.innerHTML = '';
			
			if (!lyr) {return;}
			var attrMap = lyr.attributeMapping;
			if (!attrMap) {return;}
			
			var sel = this.valfillSelectElement;
			
			attrMap.forEachAttribute(function(attrName, attrMetadata) {
				if (!isMMRequiredAttribute(attrName)) {
					var opt = $H('option');
					opt.appendChild($T(attrName));
					sel.appendChild(opt);
				}
			});
		},
		
		onAddAttributeButtonClick: function() {
			var lyr = this.getCurrentSourceLayer();
			var aname = this.a_addNameInputElement.value;
			if (lyr && lyr.addAttribute && aname && aname.length) {
				
				if (kRequiredAttributes.hasOwnProperty(aname)) {
					// Bad name
				} else {
					lyr.addAttribute(aname, AttributeType.INTEGER);
				}
			}
		},
		
		onValueFillButtonClick: function() {
			// Check attribute name
			var aname = this.getValueFillTargetAttributeName();
			var valid = this.isValueFillTargetValid(aname);
			if (!valid) {
				return;
			}

			// Check target layer
			var lyr = this.getCurrentSourceLayer();
			if (!lyr) {return;}
			var attrMap = lyr.attributeMapping;
			if (!attrMap) {return;}
			
			this.ownerApp.valueFillDialog.open( (function() {
				lyr.fillValueAllTime(aname, this.valfillInputElement.value, true);
			}).bind(this) );
		},
		
		getValueFillTargetAttributeName: function() {
			return this.valfillSelectElement.value;
		},
		
		isValueFillTargetValid: function(name) {
			if (!name) { return false; }
			if (name.length < 1) { return false; }

			return true;
		},
		
		onAddSelectionToAnnotationClick: function() {
			if (this.ownerApp) {
				this.ownerApp.addCurrentSelectionToAnnotations(this.currentTargetId);
				this.ownerApp.revealAnnotationView();
			}
		},
		
		onExportButtonClick: function() {
			if (this.ownerApp) {
				this.ownerApp.openExportSelectionWindow( this.getCurrentSourceLayer() );
			}
		}
	};

	// +++ Export +++
	aGlobal.mobmap.DataDetailView = DataDetailView;
})(window);