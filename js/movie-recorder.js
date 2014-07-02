(function(aGlobal) {
	'use strict';
	var gApp = null;
	
	function MovieRecorder(captureVideoElement, triggerElement, nacl_module) {
		this.jElement = $( document.createElement('span') );
		this.inputDuration = null;
		this.inputSecPerFrame = null;
		
		this.triggerOriginalLabel = '';
		this.naclModule = nacl_module;
		this.option = new MovieRecorderOption();
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
			lastRequestId: -1,
			lastVideoTime: -1,
			totalFrameCount: 0,
			nextRequestId: (Math.random() * 0x3fffffff) | 0
		};
		
		this.checkVideoUpdatedClosure = this.checkVideoUpdated.bind(this);
		this.jTrigger.click(this.onTriggerClick.bind(this));
		this.regionSelector.adjustRightBottom();
	}
	
	MovieRecorder.MovieDurationInputEvent = 'mr-event-movie-duration-input';
	MovieRecorder.MovieSecPerFInputEvent = 'mr-event-movie-spf-input';
	
	MovieRecorder.prototype = {
		eventDispatcher: function() { return this.jElement; },

		// Setting inputs --------

		generateOptionButtons: function(containerElement) {
			this.generateDurationBox(containerElement);
			this.generateSpacer(containerElement);
			this.generateSecPerFrame(containerElement);
			this.generateSpacer(containerElement);
			
			var adjustPositionButton = this.generateSimpleButton('images/mvbtn-pos.png', 'Auto adjust position', 
			                            this.onAdjustPositionButtonClick.bind(this));
			containerElement.appendChild(adjustPositionButton);
			this.updateMovieStats();
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
		
		updateMovieStats: function() {
			var new_dur = this.getMovieDurationInputVaule();
			var new_spf = this.getSecPerFrameInputValue();
			var dirty = false;
			
			if (this.runStatus.movieDuration !== new_dur) {
				this.runStatus.movieDuration = new_dur;
				dirty = true;
			}
			
			if (dirty) {
				this.runStatus.totalFrameCount = this.runStatus.movieDuration * this.runStatus.fps + 10;
				$('#movie-stats-box').text( this.generateMovieStatsString() );
			}
		},
		
		generateMovieStatsString: function() {
			return "Movie duration: " +this.runStatus.movieDuration+ "sec.(" +this.runStatus.totalFrameCount+ "frames)";
		},
		
		getMovieDurationInputVaule: function() {
			return this.inputDuration.value | 0;
		},
		
		getSecPerFrameInputValue: function() {
			return this.inputSecPerFrame.value | 0;
		},
		
		// --------------------
		
		run: function() {
			this.prepareNewBuffer();
			this.openEncoder();
			
			this.runStatus.running = true;
			this.runStatus.frameIndex = 0;
			this.runStatus.startWait = 10;
			
			this.sendRenderRequest(0);
		},
		
		prepareNewBuffer: function() {
			this.recieveBuffer = new nacl264.ExpandableBuffer();
		},
		
		openEncoder: function() {
			nacl264.setEncoderParams(this.naclModule, {
				fps: this.runStatus.fps,
				width: this.regionSelector.width,
				height: this.regionSelector.height
			});
			
			nacl264.openEncoder(this.naclModule);
		},
		
		onRenderRequestComplete: function(requestId) {
			if (this.runStatus.lastRequestId === requestId) {
				this.renderFrame();
			}
		},
		
		renderFrame: function() {
			console.log("Rendering frame ",this.runStatus.frameIndex);
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
			
			var dsec = (this.runStatus.startWait === 0) ? this.option.mmsecPerFrame : 0;
			if (this.runStatus.frameIndex < 160) {
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
			this.run();
		},
		
		saveTriggerOriginalLabel: function() {
			this.triggerOriginalLabel = this.jTrigger.text();
		},
		
		afterAllFramesSent: function() {
			nacl264.closeEncoder(this.naclModule);
		},
		
		afterEncoderClose: function() {
			this.showSaveLink();
		},
		
		showSaveLink: function() {
			var blob = this.recieveBuffer.exportBlob();

			var a = document.getElementById('result-dl');
			a.style.display = 'block';
			a.href = window.URL.createObjectURL(blob);
			a.setAttribute('download', 'nacl264-generated.mkv');
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


	function MovieRecorderOption() {
		this.mmsecPerFrame = 20;
		this.movieFPS      = 30;
		this.totalFrames   = 240;
	}

	function RegionSelector(sourceVideo) {
		this.sourceVideo = sourceVideo;
		this.element = document.createElement('canvas');
		this.jElement = $(this.element);
		
		this.dragging = false;
		this.dragPrevPos = {
			x:0, y:0
		};
		
		this.offset = {
			x:0, y:0
		};
		
		this.width = 720;
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
		
		setSize: function(w, h) {
			this.width = w;
			this.height = h;
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
		$('#main-control-box').show();
		$('#movie-option-box').show();
		$('#movie-stats-box').show();
	}
	
	function setupCapture() {
		chrome.desktopCapture.chooseDesktopMedia(["window"], function(streamId){
			navigator.webkitGetUserMedia({
				audio:false,
				video: {

					mandatory: {
						chromeMediaSource: "desktop",
						chromeMediaSourceId: streamId,
						minWidth          : 720,
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
		nacl_container.addEventListener('message', gApp.handleModuleMessage.bind(gApp), true);
	}
	
	function onCaptureFail() {
		
	}
	
	window.notifyRenderRequestComplete = function(requestId) {
		if (gApp) {
			gApp.onRenderRequestComplete(requestId);
		}
	}
})(window);