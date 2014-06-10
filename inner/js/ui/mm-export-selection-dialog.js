if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function ExportSelectionDialog() {
		this.targetLayer = null;
		this.jTrjKMLBox = null;
		this.jTrjKMLLeadSentence = null;
		this.jTrjKMLButton = null;
		this.jWaitIndicator = null;
		this.jGeneratedKMLLinkElement = null;
		this.initProperties();
	}
	
	ExportSelectionDialog.prototype = {
		ensureWindowElement: function() {
			if (!this.element) {
				this.buildView();
				this.jMessageArea.html("Click button to start.");
				
				var tkml = this.generateTrajectoryKMLExportBox();
				this.insertElementBeforeButtonArea(tkml);
			}
		},

		generateTrajectoryKMLExportBox: function() {
			var box = document.createElement('div');
			this.jTrjKMLBox = $(box).hide();
			
			var lead = document.createElement('div');
			this.jTrjKMLLeadSentence = $(lead);
			
			var buttonContainer = document.createElement('div');
			buttonContainer.setAttribute('class', 'mm-export-triggers-container');
			
			var btn = document.createElement('button');
			btn.innerHTML = 'Generate Trajectory KML';
			this.jTrjKMLButton = $(btn).click(this.onTrajectoryKMLButtonClick.bind(this));

			var wait = this.generateWaitIndicator();
			this.jWaitIndicator = $(wait).hide();

			var a = document.createElement('a');
			a.innerHTML = 'Save';
			a.setAttribute('class', 'mm-export-result-link');
			a.setAttribute('download', 'mobmap-exported.kml');
			a.setAttribute('target', '_blank');
			this.jGeneratedKMLLinkElement = $(a);
			
			buttonContainer.appendChild(btn);
			box.appendChild(lead);
			box.appendChild(buttonContainer);
			box.appendChild(wait);
			box.appendChild(a);
			return box;
		},
		
		generateWaitIndicator: function() {
			var box = document.createElement('div');
			box.innerHTML = 'Wait...';
			box.setAttribute('class', 'mm-export-wait-indicator');

			return box;
		},

		showDialog: function(targetLayer) {
			this.targetLayer = targetLayer;
			this.ensureWindowElement();
			this.initTrajectoryKMLExportBox();
			this.showDialogOnCenter('Export', false, 82);
		},
		
		initTrajectoryKMLExportBox: function() {
			this.jGeneratedKMLLinkElement.hide();
			this.jWaitIndicator.hide();

			var lyr = this.targetLayer;
			if (!(lyr.capabilities & mobmap.LayerCapability.SpatialSelectable)) {
				this.jTrjKMLBox.hide();
				return;
			}
			
			this.jTrjKMLBox.show();
			this.jTrjKMLButton.show();
			var selp = lyr.localSelectionPool;
			if (selp.isAnySelected()) {
				this.jTrjKMLLeadSentence.text('Selection: ' +selp.count()+ 'IDs')
			} else {
				this.jTrjKMLLeadSentence.text('Selection: none (All objects will be exported)')
			}
		},
		
		onTrajectoryKMLButtonClick: function() {
			this.jTrjKMLButton.hide();
			this.jWaitIndicator.show();
			var generator = new ExportKMLGenerator(this.targetLayer, this.onKMLGeneratorFinish.bind(this));
			generator.generate();
		},
		
		onKMLGeneratorFinish: function(generator) {
			var url = generator.getResourceURL();

			this.jWaitIndicator.hide();
			this.jGeneratedKMLLinkElement.attr('href', url).show();
		}
	};
	
	function ExportKMLGenerator(sourceLayer, onFinish) {
		this.sourceLayer = sourceLayer;
		this.onFinish = onFinish;
		this.xmlLines = [];
		this.jobIDList = [];
		
		this.nextClosure = this.generateNextChunk.bind(this);
	}
	
	ExportKMLGenerator.prototype = {
		generate: function() {
			this.xmlLines.length = 0;
			this.jobIDList.length = 0;
			
			this.addIDsToExport(this.jobIDList, this.sourceLayer);
//			console.log(this.jobIDList)
			
			ExportKMLGenerator.generateDataSchema(this.xmlLines, this.sourceLayer);
			this.generateNextChunk();
		},
		
		getResourceURL: function() {
			var b = new Blob(this.xmlLines);
			return window.URL.createObjectURL(b);
		},
		
		addIDsToExport: function(outList, layer) {
			var selp = layer.localSelectionPool;
			if (selp.isAnySelected()) {
				selp.pushIDsToArray(outList);
			} else {
				// all
				var idmap = layer.movingData.idMap;
				for (var i in idmap) {
					outList.push(i);
				}
			}
		},
		
		generateNextChunk: function() {
			var hasMore = false;
			
			for  (var i = 0;i < 50;++i) {
				if ( this.generateFeature() ) {
					hasMore = true;
				} else {
					break;
				}
			}
			
			if (hasMore) {
				setTimeout(this.nextClosure, 1);
			} else {
				// Finish
				ExportKMLGenerator.wrapKMLDocument(this.xmlLines);

				// Call listener
				if (this.onFinish) { this.onFinish(this); }
			}
		},
		
		generateFeature: function() {
			if (this.jobIDList.length < 1) {
				return false;
			}
			
			var objId = this.jobIDList.shift();
			// console.log(objId, this.jobIDList.length)
			
			var tl = this.sourceLayer.movingData.getTimeListOfId(objId);
			if (tl) {
				this.generatePlacemarkElement(objId, tl, this.sourceLayer.attributeMapping);
			}

			return true;
		},
		
		generatePlacemarkElement: function(objId, tlist, attrMap) {
			var firstRecord = tlist.getRecordList()[0] || null;
			
			this.xmlLines.push('  <Placemark id="' +objId+ '">\n');

			this.xmlLines.push('   <LineString><coordinates>');
			this.xmlLines.push(ExportKMLGenerator.generateCoordinateList(tlist));
			this.xmlLines.push('   </coordinates></LineString>\n');

			this.xmlLines.push('   <ExtendedData>\n');
			this.xmlLines.push('    ' + this.generateSchemaDataStart() + '\n' );
			this.exportAttributes(this.xmlLines, firstRecord, attrMap);
			this.xmlLines.push('    </SchemaData>\n');
			this.xmlLines.push('   </ExtendedData>\n');

			this.xmlLines.push('  </Placemark>\n');
		},
		
		generateSchemaDataStart: function() {
			return '<SchemaData schemaUrl="#' +ExportKMLGenerator.SCHEMA_ID+ '">';
		},
		
		exportAttributes: function(outLines, record, attrMap) {
			if (!attrMap || !record) {
				return;
			}
			
			attrMap.forEachAttribute(function(name, metadata) {
				if (!isMMRequiredAttribute(name)) {
					var val = mmEscapeHTML(record[name]);
					outLines.push('     <SimpleData name="' +name+ '">' +val+ '</SimpleData>\n');
				}
			});
		}
	};
	
	ExportKMLGenerator.SCHEMA_ID = 'mm-attributes-schema';
	
	ExportKMLGenerator.generateDataSchema = function(outLines, layer) {
		outLines.push('  <Schema id="' +ExportKMLGenerator.SCHEMA_ID+ '">\n');
		var attrMap = layer.attributeMapping;
		if (attrMap) {
			attrMap.forEachAttribute(function(name, metadata) {
				if (!isMMRequiredAttribute(name)) {
					var dtype = ExportKMLGenerator.getDataTypeString(metadata.dataType);
					outLines.push('   <SimpleField name="' +name+ '" type="' +dtype+ '"></SimpleField>\n');
				}
			});
		}
		
		outLines.push('  </Schema>\n\n');
	};
	
	ExportKMLGenerator.getDataTypeString = function(t) {
		switch(t) {
			case AttributeType.INTEGER:
				return 'int';

			case AttributeType.FLOAT:
			case AttributeType.CFLOAT:
				return 'float';
			
			default:
				return 'string'
		}
	};

	ExportKMLGenerator.generateCoordinateList = function(tlist) {
		var recordList = tlist.getRecordList();
		var len = recordList.length;
		
		var a = [];
		for (var i = 0;i < len;++i) {
			var rec = recordList[i];
			a.push(rec.x+','+rec.y);
		}
		
		return a.join(' ');
	};
	
	ExportKMLGenerator.wrapKMLDocument = function(lines) {
		lines.unshift(' <Document>\n');
		lines.unshift('<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2" xmlns:kml="http://www.opengis.net/kml/2.2" xmlns:atom="http://www.w3.org/2005/Atom">\n');
		lines.unshift('<?xml version="1.0" encoding="UTF-8"?>\n');
			
		lines.push(' </Document>\n');
		lines.push('</kml>');
		
		return lines;
	};


	mobmap.MMDialogBaseInstallAPIs(ExportSelectionDialog.prototype);
	aGlobal.mobmap.ExportSelectionDialog = ExportSelectionDialog;
})(window);