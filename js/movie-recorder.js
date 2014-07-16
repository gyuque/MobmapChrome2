(function(aGlobal) {
	'use strict';
	var gApp = null;
	var PADDING_FRAMES = 20;
	
	var kResolutionPresets = [
		{width: 640, height: 480},
		{width: 854, height: 480},
		{width: 1280, height: 720}
	];
	
	function MovieRecorder(captureVideoElement, triggerElement, nacl_module) {
		this.jElement = $( document.createElement('span') );
		this.inputDuration = null;
		this.inputSecPerFrame = null;
		this.inputClockCheck = null;
		this.jResolutionRadios = null;
		
		this.triggerOriginalLabel = '';
		this.naclModule = nacl_module;
		this.captureVideoElement = captureVideoElement;
		this.previewContainerElement = document.getElementById('preview-container');
		this.recieveBuffer = null;
		
		this.regionSelector = new RegionSelector(this.captureVideoElement);
		this.previewContainerElement.appendChild(this.regionSelector.element);
		this.jTrigger = $(triggerElement);
		this.saveTriggerOriginalLabel();
		
		this.runStatus = {
			fps: 30,
			running: false,
			frameIndex: 0,
			startWait: 0,
			movieDuration: -1,
			secPerFrame: -1,
			lastRequestId: -1,
			lastVideoTime: -1,
			bodyFrameCount: 0,
			totalFrameCount: 0,
			nextRequestId: (Math.random() * 0x3fffffff) | 0
		};
		
		this.checkVideoUpdatedClosure = this.checkVideoUpdated.bind(this);
		this.jTrigger.click(this.onTriggerClick.bind(this));
		this.regionSelector.adjustRightBottom();
	}
	
	MovieRecorder.MovieDurationInputEvent = 'mr-event-movie-duration-input';
	MovieRecorder.MovieSecPerFInputEvent = 'mr-event-movie-spf-input';
	MovieRecorder.MovieClockCheckInputEvent = 'mr-event-movie-clock-check-input';
	
	MovieRecorder.prototype = {
		eventDispatcher: function() { return this.jElement; },

		// Setting inputs --------

		generateOptionButtons: function(containerElement) {
			this.generateDurationBox(containerElement);
			 this.generateSpacer(containerElement);
			this.generateSecPerFrame(containerElement);
			 this.generateSpacer(containerElement);
			this.generateClockCheck(containerElement);
			 this.generateSpacer(containerElement);
			
			var adjustPositionButton = this.generateSimpleButton('images/mvbtn-pos.png', 'Auto adjust position', 
			                            this.onAdjustPositionButtonClick.bind(this));
			containerElement.appendChild(adjustPositionButton);
			this.updateMovieStats();
			this.observeOptionInputs();
		},
		
		generateSimpleButton: function(iconURL, label, listenerClosure) {
			var img = document.createElement('img');
			img.src = iconURL;
			img.alt = label;
			img.title = label;
			img.setAttribute('class', 'mm-movie-option-button');
			
			if (listenerClosure) {
				$(img).click(listenerClosure);
			}
			
			return img;
		},
		
		generateSecPerFrame: function(containerElement) {
			var lab = document.createElement('label');
			lab.appendChild( document.createTextNode('Advance ') );

			var numInput = this.generateNumberInput(20, 1);
			lab.appendChild(numInput);

			lab.appendChild( document.createTextNode('sec. per frame') );

			// add to container - - -
			containerElement.appendChild(lab);
			this.observeTextInput(numInput, MovieRecorder.MovieSecPerFInputEvent);
			this.inputSecPerFrame = numInput;
		},
		
		generateDurationBox: function(containerElement) {
			var lab = document.createElement('label');
			lab.appendChild( document.createTextNode('Duration: ') );
			
			var numInput = this.generateNumberInput(15, 2);
			lab.appendChild(numInput);
			
			lab.appendChild( document.createTextNode('sec.') );

			// add to container - - -
			containerElement.appendChild(lab);
			this.observeTextInput(numInput, MovieRecorder.MovieDurationInputEvent);
			this.inputDuration = numInput;
		},
		
		generateClockCheck: function(containerElement) {
			var lab = document.createElement('label');
			var chk = document.createElement('input');
			chk.type = 'checkbox';
			lab.appendChild(chk);
			lab.appendChild( document.createTextNode('Show clock') );
			
			containerElement.appendChild(lab);
			this.observeCheckInput(chk, MovieRecorder.MovieClockCheckInputEvent);
			this.inputClockCheck = chk;
			return chk;
		},
		
		generateNumberInput: function(initialValue, minValue) {
			var tx = document.createElement('input');
			tx.setAttribute('type', 'number');
			tx.setAttribute('min', minValue);
			tx.setAttribute('value', initialValue);
			tx.setAttribute('step', 1);
			tx.style.width = '4em';

			return tx;
		},
		
		generateSpacer: function(el) {
			var s = document.createElement('span');
			s.setAttribute('class', 'mm-options-spacer');
			s.innerHTML = ' ';
			el.appendChild( s );
		},
		
		onAdjustPositionButtonClick: function() {
			this.regionSelector.adjustRightBottom();
		},
		
		observeTextInput: function(tx, fire_event_type) {
			var handler = (function() {
				this.eventDispatcher().trigger(fire_event_type);
			}).bind(this);
			
			$(tx).blur(handler).keyup(handler).change(handler);
		},

		observeCheckInput: function(chk, fire_event_type) {
			var handler = (function() {
				this.eventDispatcher().trigger(fire_event_type);
			}).bind(this);
			
			$(chk).click(handler);
		},
		
		observeResolutionRadio: function(radio_name) {
			this.jResolutionRadios = $('input[name=' +radio_name+ ']');
			this.jResolutionRadios.click( this.onResolutionRadioClick.bind(this) );
		},
		
		onResolutionRadioClick: function() {
			var res = this.getSelectedResolution();
			if (res) {
				this.regionSelector.setSize(res.width, res.height, true);
			}
		},
		
		syncWithCurrentResolution: function() {
			var current_w = this.regionSelector.width;
			this.jResolutionRadios.each(function(i, el) {
				var res = kResolutionPresets[el.value | 0];
				if (res.width === current_w) {
					el.checked = true;
				}
			});
		},
		
		getSelectedResolution: function() {
			var res = null;
			this.jResolutionRadios.each(function(i, el) {
				if (el.checked) {
					res = kResolutionPresets[el.value | 0];
				}
			});
			
			return res;
		},
		
		updateMovieStats: function() {
			var new_dur = this.getMovieDurationInputVaule();
			var new_spf = this.getSecPerFrameInputValue();
			var dirty = false;
			
			if (this.runStatus.movieDuration !== new_dur) {
				this.runStatus.movieDuration = new_dur;
				dirty = true;
			}
			
			if (this.runStatus.secPerFrame !== new_spf) {
				this.runStatus.secPerFrame = new_spf;
				dirty = true;
			}
			
			var clk = this.getClockCheckValue();
			if (this.regionSelector.showClock !== clk) {
				this.regionSelector.showClock = clk;
				dirty = true;
			}
			
			if (dirty) {
				this.runStatus.bodyFrameCount = this.runStatus.movieDuration * this.runStatus.fps;
				this.runStatus.totalFrameCount = this.runStatus.bodyFrameCount + PADDING_FRAMES*2;
				$('#movie-stats-box').text( this.generateMovieStatsString() );

				this.regionSelector.redraw();
			}
		},
		
		generateMovieStatsString: function() {
			return "Movie duration: " +this.runStatus.movieDuration+ "sec.(" +this.runStatus.totalFrameCount+ "frames) / " +
			       this.generateSPFString() +" / "+
			       this.generateDataDurationString();
		},
		
		generateSPFString: function() {
			return "Advance " + this.runStatus.secPerFrame + "sec. per frame";
		},

		generateDataDurationString: function() {
			var n = this.runStatus.movieDuration * this.runStatus.fps * this.runStatus.secPerFrame;
			var time_disp = null;
			
			if (n < 60) {
				time_disp = n + "sec.";
			} else {
				time_disp = Math.floor(n/60) + "min. " +(n%60)+ "sec.";
			}
			
			return "Data duration: " + time_disp;
		},

		getMovieDurationInputVaule: function() {
			return this.inputDuration.value | 0;
		},
		
		getClockCheckValue: function() {
			return this.inputClockCheck.checked;
		},
		
		getSecPerFrameInputValue: function() {
			return this.inputSecPerFrame.value | 0;
		},
		
		observeOptionInputs: function() {
			var handler = this.updateMovieStats.bind(this);
			
			this.eventDispatcher().
			 bind(MovieRecorder.MovieClockCheckInputEvent, handler).
			 bind(MovieRecorder.MovieDurationInputEvent, handler).
			 bind(MovieRecorder.MovieSecPerFInputEvent, handler);
		},
		
		// --------------------
		
		run: function() {
			this.prepareNewBuffer();
			this.openEncoder();
			
			this.runStatus.running = true;
			this.runStatus.frameIndex = 0;
			this.runStatus.startWait = PADDING_FRAMES;
			
			this.sendRenderRequest(0);
		},
		
		changeTriggerAppearance: function() {
			this.jTrigger.addClass('busy').text('0%');
		},
		
		updateProgressLabel: function() {
			var r = this.runStatus.frameIndex / this.runStatus.totalFrameCount;
			this.jTrigger.text(Math.floor(r * 100.0) + '%');
		},
		
		prepareNewBuffer: function() {
			this.recieveBuffer = new nacl264.ExpandableBuffer();
		},
		
		openEncoder: function() {
			nacl264.setOutputType(this.naclModule, 'mp4');
			nacl264.setEncoderParams(this.naclModule, {
				fps: this.runStatus.fps,
				width: this.regionSelector.width,
				height: this.regionSelector.height
			});
			
			nacl264.openEncoder(this.naclModule);
		},
		
		onRenderRequestComplete: function(requestId, renderedTime) {
			if (this.runStatus.lastRequestId === requestId) {
				this.regionSelector.setRenderedTime(renderedTime);
				this.renderFrame();
			}
		},
		
		renderFrame: function() {
			// console.log("Rendering frame ",this.runStatus.frameIndex);
			this.waitVideoUpdated();
		},
		
		waitVideoUpdated: function() {
			this.runStatus.lastVideoTime = this.regionSelector.sourceVideo.currentTime;
			setTimeout(this.checkVideoUpdatedClosure, 10);
		},
		
		checkVideoUpdated: function() {
			var t = this.regionSelector.sourceVideo.currentTime;
			if (t > (this.runStatus.lastVideoTime + 0.01)) {
				this.onVideoUpdated();
			} else {
				setTimeout(this.checkVideoUpdatedClosure, 10);
			}
		},
		
		onVideoUpdated: function() {
			this.regionSelector.redraw();
			
			nacl264.sendFrameFromCanvas(this.naclModule, this.regionSelector.element );
			this.regionSelector.drawNonEncodedInfo(this.runStatus.frameIndex);
		},
		
		onFrameEncodeEnd: function() {
			++this.runStatus.frameIndex;
			if (this.runStatus.startWait > 0) {
				--this.runStatus.startWait;
			}
			
			var dsec = (this.runStatus.startWait === 0) ? this.runStatus.secPerFrame : 0;
			if (this.runStatus.frameIndex >= (this.runStatus.bodyFrameCount + PADDING_FRAMES)) {
				// Tail padding frames
				dsec = 0;
			}
			
			this.updateProgressLabel();
			if (this.runStatus.frameIndex < this.runStatus.totalFrameCount) {
				this.sendRenderRequest(dsec);
			} else {
				this.afterAllFramesSent();
			}
		},
		
		sendRenderRequest: function(dtime) {
			var rid = ++this.runStatus.nextRequestId;
			
			this.runStatus.lastRequestId = rid;
			window.outerRequestMapRender(rid, dtime);
		},
		
		onTriggerClick: function() {
			if (!this.runStatus.running) {
				this.changeTriggerAppearance();
				this.run();
			}
		},
		
		saveTriggerOriginalLabel: function() {
			this.triggerOriginalLabel = this.jTrigger.text();
		},
		
		afterAllFramesSent: function() {
			nacl264.closeEncoder(this.naclModule);
		},
		
		afterEncoderClose: function() {
			this.jTrigger.hide();
			this.showSaveLink();
		},
		
		showSaveLink: function() {
			$('#dl-container').show();
			var blob = this.recieveBuffer.exportBlob();

			var a = document.getElementById('result-dl');
			a.style.display = 'block';
			a.href = window.URL.createObjectURL(blob);
			a.setAttribute('download', 'nacl264-generated.mp4');
		},
		
		handleModuleMessage: function(message_event) {
			var mbody = message_event.data;
			var mtype = mbody.type;

			var M = nacl264.IncomingMessageTypes;
			switch(mtype) {
			case M.EncodeFrameDone:
				this.onFrameEncodeEnd();
				break;

			case M.SendBufferedData:
				this.recieveBuffer.write(mbody.content);
				break;

			case M.SeekBuffer:
				this.recieveBuffer.seek(mbody.position);
				break;

			case M.EncoderClosed:
				this.afterEncoderClose();
				break;
			}
		}
	};

	function RegionSelector(sourceVideo) {
		this.sourceVideo = sourceVideo;
		this.element = document.createElement('canvas');
		this.jElement = $(this.element);
		this.clockRenderer = new mobmap.ClockRenderer(140, 176);
		
		this.dragging = false;
		this.dragPrevPos = {
			x:0, y:0
		};
		
		this.offset = {
			x:0, y:0
		};
		
		this.showClock = false;
		this.width = 854;
		this.height = 480;
		this.updateCanvasSize();
		this.redraw();
		
		this.redrawClosure = this.intervalRedraw.bind(this);
		this.intervalRedraw();
		
		this.observeMouse();
	}

	RegionSelector.prototype = {
		eventDispatcher: function() {
			return this.jElement;
		},
		
		setSize: function(w, h, autoAdjust) {
			if (this.width !== w || this.height !== h) {
				this.width = w;
				this.height = h;
				
				this.element.width = w;
				this.element.height = h;
				
				if (autoAdjust) {
					this.adjustRightBottom();
				}
			}
		},
		
		adjustRightBottom: function() {
			var ww = window.outerWindowGetWidth();
			var wh = window.outerWindowGetHeight();
			
			var ox = this.width - ww;
			var oy = this.height - wh;
			
			this.setOffset(ox+2, oy+1);
		},
		
		updateCanvasSize: function() {
			this.element.width = this.width;
			this.element.height = this.height;
		},
		
		redraw: function() {
//			console.log(this.sourceVideo.currentTime);
			var g = this.element.getContext('2d');
			g.fillStyle = '#000';
			g.fillRect(0, 0, this.width, this.height);
			
			g.drawImage(this.sourceVideo, this.offset.x, this.offset.y);
			if (this.showClock) {
				this.renderClock(g);
			}
		},
		
		renderClock: function(g) {
			var cr = this.clockRenderer;
			
			g.save();
			g.translate(this.width - cr.width - 9, this.height - cr.height - 13);
			cr.render(g);
			g.restore();
		},
		
		drawNonEncodedInfo: function(frameIndex) {
			var g = this.element.getContext('2d');
			var xoffsets = [-1,  1,  0,  0, 0];
			var yoffsets = [ 0,  0, -1,  1, 0];
			g.save();
			var label = "Frame index: " + frameIndex;
			
			for (var i = 0;i < 5;++i) {
				g.fillStyle = (i === 4) ? "#fff": "rgba(0,0,0,0.8)";
				g.fillText(label, 3 + xoffsets[i], 10 + yoffsets[i]);
			}
			
			g.restore();
		},
		
		intervalRedraw: function() {
			this.redraw();
			setTimeout(this.redrawClosure, 500);
		},
		
		observeMouse: function() {
			$(this.element).
			 mousemove(this.onMouseMove.bind(this)).
			 mouseup(this.onMouseUp.bind(this)).
			 mousedown(this.onMouseDown.bind(this));
		},
		
		onMouseDown: function(e) {
			this.dragging = true;
			this.dragPrevPos.x = e.screenX;
			this.dragPrevPos.y = e.screenY;
		},
		
		onMouseUp: function(e) {
			this.dragging = false;
		},
		
		onMouseMove: function(e) {
			if (this.dragging) {
				var dx = e.screenX - this.dragPrevPos.x;
				var dy = e.screenY - this.dragPrevPos.y;
			
				this.dragPrevPos.x = e.screenX;
				this.dragPrevPos.y = e.screenY;
				
				this.moveOffset(dx, dy);
			}
		},
		
		moveOffset: function(dx, dy) {
			this.offset.x += dx;
			this.offset.y += dy;
			this.redraw();
		},
		
		setOffset: function(x, y) {
			this.offset.x = x;
			this.offset.y = y;
			this.redraw();
		},
		
		setRenderedTime: function(unixtime) {
			var d = new Date(unixtime * 1000.0);

			var hr = d.getHours();
			var mn = d.getMinutes();
			var sc = d.getSeconds();

			this.clockRenderer.hour = hr;
			this.clockRenderer.min  = mn;
			this.clockRenderer.sec  = sc;
			this.clockRenderer.makeTopLabelFromDate(d);
		}
	};
	
	// Launch
	aGlobal.onload = function() {
		setTimeout(waitNacl264, 500);
	};
	
	function waitNacl264() {
		if (window.nacl264Ready) {
			hideInitialMessage();
			setupCapture();
		} else {
			setTimeout(waitNacl264, 500);
		}
	}
	
	function hideInitialMessage() {
		$('#boot-message').hide();
		$('#preview-container').show();
		$('#configuration-area').show();
	}
	
	function setupCapture() {
		chrome.desktopCapture.chooseDesktopMedia(["window"], function(streamId){
			navigator.webkitGetUserMedia({
				audio:false,
				video: {

					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: streamId,
						minWidth          : 640,
						maxWidth          : 2560,
						minHeight         : 480,	
						maxHeight         : 1440
					}

				}
			},
			onCaptureSuccess,
			onCaptureFail
			);
			
			
		});
	};
	
	function onCaptureSuccess(stream) {
		var nacl_module = document.getElementById('nacl264-embed');
		var nacl_container = document.getElementById('nacl-container');
		var video = document.createElement('video');

		video.src = URL.createObjectURL(stream);
		video.style.display = "none";
		document.body.appendChild(video);
		video.play();
		
		gApp = new MovieRecorder(video, document.getElementById('record-trigger'), nacl_module);
		gApp.generateOptionButtons(document.getElementById('movie-option-box'));
		gApp.observeResolutionRadio('m-resolution');
		gApp.syncWithCurrentResolution();
		nacl_container.addEventListener('message', gApp.handleModuleMessage.bind(gApp), true);
	}
	
	function onCaptureFail() {
		
	}
	
	window.notifyRenderRequestComplete = function(requestId, renderedTime) {
		if (gApp) {
			gApp.onRenderRequestComplete(requestId, renderedTime);
		}
	}
})(window);