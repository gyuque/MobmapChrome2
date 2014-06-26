(function(aGlobal) {
	'use strict';
	var gApp = null;
	
	function MovieRecorder(captureVideoElement, triggerElement) {
		this.triggerOriginalLabel = '';
		this.option = new MovieRecorderOption();
		this.captureVideoElement = captureVideoElement;
		this.previewContainerElement = document.getElementById('preview-container');
		
		this.regionSelector = new RegionSelector(this.captureVideoElement);
		this.previewContainerElement.appendChild(this.regionSelector.element);
		this.jTrigger = $(triggerElement);
		this.saveTriggerOriginalLabel();
		
		this.runStatus = {
			running: false,
			frameIndex: 0,
			startWait: 0,
			lastRequestId: -1,
			lastVideoTime: -1,
			nextRequestId: (Math.random() * 0x3fffffff) | 0
		};
		
		this.checkVideoUpdatedClosure = this.checkVideoUpdated.bind(this);
		this.jTrigger.click(this.onTriggerClick.bind(this));
	}
	
	MovieRecorder.prototype = {
		run: function() {
			this.runStatus.running = true;
			this.runStatus.frameIndex = 0;
			this.runStatus.startWait = 10;
			
			this.sendRenderRequest(0);
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
			setTimeout(this.onFrameEncodeEnd.bind(this), 9);
		},
		
		onFrameEncodeEnd: function() {
			++this.runStatus.frameIndex;
			if (this.runStatus.startWait > 0) {
				--this.runStatus.startWait;
			}
			
			var dsec = (this.runStatus.startWait === 0) ? this.option.mmsecPerFrame : 0;
			if (this.runStatus.frameIndex < 60) {
				this.sendRenderRequest(dsec);
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
		}
	};


	function MovieRecorderOption() {
		this.mmsecPerFrame = 10;
		this.movieFPS      = 30;
		this.totalFrames   = 240;
	}

	function RegionSelector(sourceVideo) {
		this.sourceVideo = sourceVideo;
		this.element = document.createElement('canvas');
		
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
		setSize: function(w, h) {
			this.width = w;
			this.height = h;
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
		var video = document.createElement('video');

		video.src = URL.createObjectURL(stream);
		video.style.display = "none";
		document.body.appendChild(video);
		video.play();
		
		gApp = new MovieRecorder(video, document.getElementById('record-trigger'));
	}
	
	function onCaptureFail() {
		
	}
	
	window.notifyRenderRequestComplete = function(requestId) {
		if (gApp) {
			gApp.onRenderRequestComplete(requestId);
		}
	}
})(window);