if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	var kGradientCanvasWidth = 1024;
	var kPresetPreviewWidth = 100;
	var kPresetPreviewHeight = 10;
	
	function GradientEditor(boundGradient, label_p, altPreset, noAlpha, fixedStops) {
		this.element = document.createElement('div');
		this.jElement = $( this.element );
		this.jSwapButton = this.generateSwapButton();
		this.alternativePreset = altPreset || 0;
		this.noAlpha = !!noAlpha;
		this.boundGradient = boundGradient;
		this.stopListView = new GradientStopListView(!noAlpha, fixedStops);
		this.previewLabelProvider = label_p || null;
		
		this.previewHeight = 10;
		this.previewWidth = 100;
		this.previewPadding = 4;
		
		this.previewCanvas = document.createElement('canvas');
		this.previewCanvasG = this.previewCanvas.getContext('2d');
		this.buildPresetSelector(this.element);
		this.element.appendChild(this.previewCanvas);
		this.element.appendChild(this.stopListView.element);
		this.element.appendChild(this.jSwapButton[0]);

		this.smallPreviewCanvas = document.createElement('canvas');
		this.smallPreviewCanvasG = this.smallPreviewCanvas.getContext('2d');

		this.gradientCanvas = document.createElement('canvas');
		this.gradientCanvasG = this.gradientCanvas.getContext('2d');
		
		this.previewCanvas.setAttribute('class', 'mm-gradient-editor-preview');
		this.configureCanvas();
		this.redraw();
		this.sendColorList();
		
		this.syncFromModel();
		this.stopListView.eventDispatcher().bind(
			GradientStopListView.ITEM_CHANGE_EVENT,
			this.onGradientStopListViewItemChange.bind(this)
		);
	}
	
	GradientEditor.PresetGradient = [
		{
			name: 'Red gradient',
			stops: [
				[255,0,0 ,0 ,0],
				[255,0,0 ,1 ,1]
			]
		},

		{
			name: 'White gradient',
			stops: [
				[255,255,255 ,0 ,0],
				[255,255,255 ,1 ,1]
			]
		},
		
		{
			name: 'Heat',
			stops: [
				[0  ,128,255 ,1 ,0   ],
				[0  ,255,128 ,1 ,0.25],
				[255,255,0   ,1 ,0.5 ],
				[255,128,0   ,1 ,0.75],
				[255,  0,0   ,1 ,1   ]
			]
		},
		
		{
			name: 'Heat(transparent)',
			stops: [
				[0  ,128,255 ,0.5 ,0   ],
				[0  ,255,128 ,0.5 ,0.25],
				[255,255,0   ,0.5 ,0.5 ],
				[255,128,0   ,0.5 ,0.75],
				[255,  0,0   ,0.5 ,1   ]
			]
		}
	];

	GradientEditor.PresetGradient2 = [
		{
			name: 'Blue to Red',
			stops: [
				[  0,0,255, 1,0],
				[255,0,  0, 1,1]
			]
		},

		{
			name: 'Red to Yellow',
			stops: [
				[255,0  ,0, 1,0],
				[255,255,0, 1,1]
			]
		},

		{
			name: 'White to Blue',
			stops: [
				[255,255,255, 1,0],
				[  0,  0,255, 1,1]
			]
		}
	];
	
	GradientEditor.prototype = {
		pickPreset: function() {
			return this.alternativePreset ? GradientEditor.PresetGradient2 : GradientEditor.PresetGradient;
		},
		
		buildPresetSelector: function(containerElement) {
			var menuElement = $H('ul');

			var topItem = $H('li');
			topItem.appendChild( $T('Choose preset') );
			menuElement.appendChild(topItem);
			
			var preset_ls = $H('ul');
			topItem.appendChild(preset_ls);
			this.appendPresetMenuItems(preset_ls, this.pickPreset());
			
			$(menuElement).kendoMenu({ select: this.onPresetMenuSelect.bind(this) });
			containerElement.appendChild(menuElement);
		},
		
		appendPresetMenuItems: function(parentList, presets) {
			for (var i in presets) {
				var presetData = presets[i];
				var li = $H('li');
				li.setAttribute('data-index', i);
				
				var sampleLabel = $H('span', 'mm-gradient-preset-sample-label');
				sampleLabel.appendChild( $T(presetData.name) );
				
				li.appendChild( sampleLabel );
				li.appendChild( this.generatePresetGradientPreview(presetData.stops) );
				
				parentList.appendChild(li);
			}
		},
		
		onPresetMenuSelect: function(e) {
			var selectedElement = e.item;
			if (!selectedElement) {return;}
			
			var selectedIndex = selectedElement.getAttribute('data-index') - 0;
			this.usePreset( (this.pickPreset())[selectedIndex] );
		},
		
		usePreset: function(presetData) {
			this.boundGradient.clearGradient(true);
			var stops = presetData.stops;
			var len = stops.length;
			for (var i = 0;i < len;++i) {
				var s = stops[i];
				this.boundGradient.addStop( new MMGradientStop(s[4],  s[0],s[1],s[2],s[3]) );
			}
			
			this.redraw();
			this.sendColorList();
			this.boundGradient.fire();
		},
		
		generatePresetGradientPreview: function(presetStops) {
			var cv = $H('canvas');
			var w = kPresetPreviewWidth;
			var h = kPresetPreviewHeight;
			cv.width = w;
			cv.height = h;
			cv.style.border = '1px solid #000';
			
			var g = cv.getContext('2d');
			var grad = g.createLinearGradient(0, 0, w, 0);
			for (var i in presetStops) {
				var st = presetStops[i];
				grad.addColorStop(st[4], makeStyleSheetRGBA(st[0],st[1],st[2],st[3]) );
			}
			
			g.fillStyle = '#aaa';
			g.fillRect(0, 0, w, h);
			g.fillStyle = grad;
			g.fillRect(0, 0, w, h);
			
			return cv;
		},
		
		getPreviewElement: function() {
			return this.smallPreviewCanvas;
		},
		
		generateSwapButton: function() {
			var btn = document.createElement('button');
			var j = $(btn).text('Swap start/end').addClass('mm-gradient-swap-button').hide();
			
			j.click(this.onSwapButtonClick.bind(this));
			return j;
		},
		
		toggleSwapButton: function() {
			if (this.jSwapButton) {
				if (this.stopListView.countStops() === 2) {
					this.jSwapButton.show();
				} else {
					this.jSwapButton.hide();
				}
			}
		},
		
		onSwapButtonClick: function() {
			var gr = this.boundGradient;
			var len = gr.countStops();
			if (len < 2) { return; }
			
			var s0 = gr.getAt(0);
			var s1 = gr.getAt(1);
			
			var r0 = s0.r;
			var g0 = s0.g;
			var b0 = s0.b;
			var a0 = s0.a;

			s0.r = s1.r;
			s0.g = s1.g;
			s0.b = s1.b;
			s0.a = s1.a;
			
			s1.r = r0;
			s1.g = g0;
			s1.b = b0;
			s1.a = a0;
			
			this.redraw();
			this.sendColorList();
			gr.fire();
		},

		sendColorList: function() {
			this.boundGradient.cachedColorList.makeCacheFromCanvas( this.gradientCanvas );
		},
		
		configureCanvas: function() {
			this.gradientCanvas.width = kGradientCanvasWidth;
			this.gradientCanvas.height = 4;
			
			this.previewCanvas.width = this.previewWidth + (this.previewPadding << 1);
			this.previewCanvas.height = this.previewHeight + (this.previewPadding << 1);

			this.smallPreviewCanvas.width = this.previewWidth + 2;
			this.smallPreviewCanvas.height = this.previewHeight + 2;
		},
		
		redraw: function() {
			this.updateGradientCanvas();
			this.renderPreview();
			this.renderSmallPreview();
		},

		renderSmallPreview: function() {
			var w = this.previewWidth;
			var h = this.previewHeight;
			var g = this.smallPreviewCanvasG;
			g.clearRect(0, 0, w+2, h+2);
			g.fillStyle = 'rgba(0,0,0,0.5)';
			g.fillRect(0, 0, w+2, h+2);
			g.fillStyle = 'rgba(255,255,255,0.5)';
			g.fillRect(1, 1, w, h);

			g.drawImage(this.gradientCanvas, 0, 0, this.gradientCanvas.width - 0, 4,
				        1, 1, w, h);
				
			if (this.previewLabelProvider) {
				var tx = this.previewLabelProvider.getGradientPreivewLabelText();
				this.drawGradientLabel(g, w+2, h+2, tx);
			}
		},
		
		drawGradientLabel: function(g, w, h, labelText) {
			g.save();
			g.font = "10px sans-serif";
			g.textAlign = 'center';

			g.fillStyle = '#000';
			g.save();
			g.shadowBlur = 1;
			g.shadowColor = '#000';
			g.fillText(labelText, w >> 1, h - 2);
			g.restore();

			g.fillStyle = '#fff';
			g.fillText(labelText, w >> 1, h - 2);

			g.restore();
		},
		
		renderPreview: function() {
			this.clearPreview();
			var w = this.previewWidth;
			var h = this.previewHeight;
			var pad = this.previewPadding;
			
			var g = this.previewCanvasG;
			g.fillStyle = 'rgba(0,0,0,0.5)';
			g.fillRect(this.previewPadding-1, this.previewPadding-1, w+2, h+2);
			g.fillStyle = 'rgba(255,255,255,0.5)';
			g.fillRect(pad, pad, w, h);
			
			g.drawImage(this.gradientCanvas, 0, 0, this.gradientCanvas.width - 0, 4,
				        pad, pad, w, h);
				
			this.drawStopCursorsOnBar(g, pad, pad, w, this.boundGradient);
		},
		
		clearPreview: function() {
			var w = this.previewCanvas.width - 0;
			var h = this.previewCanvas.height - 0;
			this.previewCanvasG.clearRect(0, 0, w, h);
		},
		
		updateGradientCanvas: function() {
			var g = this.gradientCanvasG;
			var gr = g.createLinearGradient(0, 0, kGradientCanvasWidth, 0);
			this.registerGradientStops(gr, this.boundGradient);
			
			g.clearRect(0, 0, kGradientCanvasWidth, 4);
			g.fillStyle = gr;
			g.fillRect(0, 0, kGradientCanvasWidth, 4);
		},
		
		registerGradientStops: function(gr, source) {
			var len = source.countStops();
			for (var i = 0;i < len;++i) {
				var stopColor = source.getStopAsHTMLColor(i);
				gr.addColorStop( source.getStopPosition(i) , stopColor);
			}
		},
		
		drawStopCursorsOnBar: function(g, ox, oy, bar_width, gradientSource) {
			var len = gradientSource.countStops();
			for (var i = 0;i < len;++i) {
				var t =  gradientSource.getStopPosition(i);
				var sc = gradientSource.getStopAsHTMLColor(i);
				var bx = Math.floor((bar_width-1) * t);
				
				this.drawStopCursor(g, ox + bx, oy, this.previewHeight-1, sc);
			}
		},
		
		drawStopCursor: function(g, x, y, h, stopColor) {
			g.save();
			g.translate(x, y);
			
			g.fillStyle = 'rgba(0,0,0,0.6)';
			g.fillRect(-1, -1, 3, h+1);
			g.fillRect(-2, h-1, 5, 5);
			g.fillStyle = '#fff';
			g.fillRect(0, 0, 1, h);
			g.fillStyle = '#aaa';
			g.fillRect(-1, h, 3, 3);
			g.fillStyle = stopColor;
			g.fillRect(-1, h, 3, 3);
			
			g.restore();
		},
		
		syncFromModel: function() {
			var dirty = false;
			var gr = this.boundGradient;
			var len = gr.countStops();
			
			var currentViewLength = this.stopListView.countStops();
			if (len !== currentViewLength) {
				// fast-pass
				// It must be dirty.
				dirty = true;
			} else {
				// slow-pass
				// Check inside.
				for (var i = 0;i < len;++i) {
					if ( !( this.stopListView.hasEqualStop(i, gr.getAt(i)) ) ) {
						dirty = true;
						break;
					}
				}
			}

			if (dirty) {
				this.stopListView.syncFrom(gr);
			}

			this.toggleSwapButton();
		},
		
		onGradientStopListViewItemChange: function(e, index) {
			var st = this.stopListView.getStopDataAt(index);
			this.boundGradient.writeStopData(index, st, true);
			this.redraw();
			this.sendColorList();
			this.boundGradient.fire();
		}
	};


	function GradientStopListView(enableAlpha, fixedStops) {
		this.element = $H('table');
		this.jElement = $(this.element);
		this.items = [];
		this.enableAlpha = enableAlpha;
		this.fixedStops = !!(fixedStops);
	}
	
	GradientStopListView.ITEM_CHANGE_EVENT = "gradient-stop-listview-item-change-event";

	GradientStopListView.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		countStops: function() {
			return this.items.length;
		},
		
		hasEqualStop: function(index, stop) {
			var item = this.items[index];
			if (!item) {return false;}

			return item.stopData.equals(stop);
		},
		
		addStopItem: function(gstop) {
			var item = new GradientStopListViewItem(this, gstop, this.enableAlpha, this.fixedStops);
			this.element.appendChild(item.element);
			this.items.push(item);
		},
		
		clear: function() {
			var len = this.items.length;
			for (var i = 0;i < len;++i) {
				var item = this.items[0];
				this.remove(item);
			}
		},
		
		remove: function(item) {
			var index = this.items.indexOf(item);
			if (index >= 0) {
				this.element.removeChild(item.element);
				this.items.splice(index, 1);
			}
		},
		
		syncFrom: function(sourceGradient) {
			if (this.countStops() === sourceGradient.countStops()) {
				this.updateViewsFrom(sourceGradient);
			} else {
				this.rebuildFrom(sourceGradient);
			}
		},
		
		updateViewsFrom: function(sourceGradient) {
			var len = sourceGradient.countStops();
			for (var i = 0;i < len;++i) {
				this.items[i].syncFromStopData( sourceGradient.getAt(i) );
			}
		},
		
		rebuildFrom: function(sourceGradient) {
			this.clear();
			var len = sourceGradient.countStops();
			for (var i = 0;i < len;++i) {
				this.addStopItem( sourceGradient.getAt(i) );
			}
		},
		
		notifyItemColorChange: function(changedItem) {
			this.eventDispatcher().trigger(
				GradientStopListView.ITEM_CHANGE_EVENT,
				this.items.indexOf(changedItem)
			);
		},
		
		getStopDataAt: function(index) {
			return this.items[index].stopData;
		}
	};


	function GradientStopListViewItem(owner, initialStopData, enableAlpha, fixedStops) {
		this.owner = owner;
		this.element = $H('tr');
		this.fixedStops = !!(fixedStops);
		this.jPickerElement = null;
		this.jPosLabel = null;
		this.jPosRange = null;
		this.stopData = new MMGradientStop(0, 0, 0, 0, 0);
		this.showingPosition = -1;
		
		if (initialStopData) {
			this.stopData.copyFrom(initialStopData);
		}
		
		this.buildView(enableAlpha);
		this.syncFromStopData(initialStopData);
	}

	GradientStopListViewItem.prototype = {
		buildView: function(enableAlpha) {
			var td1 = $H('td');
			this.element.appendChild(td1);
			var td2 = $H('td', 'mm-gradient-param-col');
			this.element.appendChild(td2);
			
			var pickerElement = $H('input');
			var s_pos = $H('span');
			s_pos.innerHTML = 'Position';
			var r_pos = this.makeGradientStopOptionRange();

			this.jPosLabel = $(s_pos);
			this.jPosRange = $(r_pos).change( this.onPositionRangeChange.bind(this) );
			
			if (!this.fixedStops) {
				td1.appendChild(pickerElement);
				td2.appendChild(s_pos);
				td2.appendChild(r_pos);
			} else {
				td1.appendChild( document.createTextNode( (this.stopData.position < 0.5) ? "Start" : "End") );
				td2.appendChild(pickerElement);
			}

			this.jPickerElement = $(pickerElement);
			this.jPickerElement.kendoColorPicker({
				opacity: enableAlpha,
				change: this.onColorPickerChange.bind(this)
			});
		},
		
		onPositionRangeChange: function() {
			var pos = this.jPosRange.val() / 20.0;
			this.stopData.position = pos;
			this.showPositionText(pos);
			
			this.owner.notifyItemColorChange(this);
		},
		
		makeGradientStopOptionRange: function() {
			var r = $H('input', 'mm-range-gradient-param');
			r.type = 'range';
			r.min = 0;
			r.max = 20;
			return r;
		},
		
		getColorPickerObject: function() {
			return this.jPickerElement.data("kendoColorPicker");
		},
		
		setPickerColor: function(r, g, b, a) {
			var kc = kendo.Color.fromBytes(r,g,b,a);
			this.getColorPickerObject().color( kc );
		},
		
		syncFromStopData: function(s) {
			this.stopData.copyFrom(s);
			this.setPickerColor(s.r, s.g, s.b, s.a);
			this.syncPosition(s.position);
		},
		
		syncPosition: function(newValue) {
			if (newValue < 0) { newValue = 0; }
			else if (newValue > 1) { newValue = 1; }
			
			if (Math.abs(newValue - this.showingPosition) < 0.0001) { return; }
			
			this.showingPosition = newValue;
			var sliderVal = Math.floor(newValue * 20);
			this.jPosRange.val(sliderVal);
			this.showPositionText(newValue);
		},
		
		showPositionText: function(pos) {
			this.jPosLabel.text('Position: ' + pos.toFixed(2));
		},
		
		onColorPickerChange: function() {
			var st = this.stopData;
			var kc = this.getColorPickerObject().color().toBytes();
			st.r = kc.r;
			st.g = kc.g;
			st.b = kc.b;
			st.a = kc.a;

			this.owner.notifyItemColorChange(this);
		}
	};

	aGlobal.mobmap.GradientEditor = GradientEditor;
})(window);