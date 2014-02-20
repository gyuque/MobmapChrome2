if (!window.mobmap) { window.mobmap={}; }

(function(aGlobal) {
	'use strict';
	
	function SelectionController(ownerApp) {
		this.ownerApp = ownerApp;
		this.currentSelectionSession = null;
		this.responders = [];
	}
	
	SelectionController.prototype = {
		getCurrentSession: function() {
			return this.currentSelectionSession;
		},
		
		clear: function() {
			var prj = this.ownerApp.getCurrentProject();
			prj.forEachLayer(function(index, layer){
				console.log("ToDo: clear", index)
			});
		},
		
		addResponder: function(r) {
			if (this.responders.indexOf(r) >= 0) {
				return false;
			}
			
			this.responders.push(r);
			return true;
		},
		
		disposeCurrentSession: function(fireAfter) {
			if (this.currentSelectionSession) {
				this.fireSessionDispose();
				this.currentSelectionSession = null;
				if (fireAfter) {
					this.fireAfterDisposeSession();
				}
			}
		},
		
		startRectSelectionSession: function() {
			this.disposeCurrentSession();
			
			this.fireNewSession();
			this.currentSelectionSession = new mobmap.RectSelectionSession();
			this.fireAfterNewSession();
		},
		
		cancelSessionIfType: function(stype, fireAfter) {
			if (this.currentSelectionSession) {
				if (this.currentSelectionSession.getType() === stype) {
					this.disposeCurrentSession(fireAfter);
					return true;
				}
			}
			
			return false;
		},
		
		putSessionFirstPoint: function(lat, lng) {
			var s = this.currentSelectionSession;
			if (s && s.setStartPos) {
				s.setStartPos(lat, lng);
			}
		},
		
		putSessionDraggingPoint: function(lat, lng) {
			var s = this.currentSelectionSession;
			if (s && s.setEndPos) {
				s.setEndPos(lat, lng);
				this.fireAfterSessionStateUpdate(s);
			}
		},
		
		commitDraggingSelection: function() {
			this.disposeCurrentSession(true);
		},
		
		fireSessionDispose: function() { this.callResponders('selWillDisposeCurrentSession'); },
		fireNewSession: function() { this.callResponders('selWillStartNewSession'); },
		fireAfterDisposeSession: function() { this.callResponders('selDidDisposeSession'); },
		fireAfterNewSession: function() { this.callResponders('selDidStartNewSession'); },
		fireAfterSessionStateUpdate: function(s) { this.callResponders('selDidUpdateSession',s); },
		
		callResponders: function(methodName, arg1, arg2) {
			var required = SelectionControllerResponderMethodList[methodName] || false;
			var ls = this.responders;
			var len = ls.length;
			
			for (var i = 0;i < len;++i) {
				var recv = ls[i];
				var hasMethod = !!recv[methodName];
				
				if (!hasMethod && required) {
					throw "Responder must implement " + methodName;
				}
				
				if (hasMethod) {
					recv[methodName](this, arg1, arg2);
				}
			}
		}
	};
	
	var SelectionControllerResponderMethodList = {
		// name                       | required
		selWillDisposeCurrentSession  : false,
		selWillStartNewSession        : false,
		selDidDisposeSession          : false,
		selDidStartNewSession         : false,
		selDidUpdateSession           : false
	};

	aGlobal.mobmap.SelectionController = SelectionController;
})(window);