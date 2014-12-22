if (!window.mobmap) { window.mobmap={}; }

(function() {
	function ExpressionQuery() {
		this.sourceString = null;
		this.tokenList = null;
		this.rootNode = null;
		this.hasError = false;
		
		this.expecting = 0;
		this.lookingTokenIndex = 0;
	}
	
	var TOK_NUMBER = 1;
	var TOK_IDENT  = 2;
	var TOK_COMP   = 3;
	var TOK_LOGIC  = 4;
	var TOK_WS     = 9;
	
	var EXPECTING_LEFTHAND = 1;
	var EXPECTING_LOGICAL  = 2;
	
	var lexRegexs = [
		{id: TOK_NUMBER, re: /^[-+]?[.0-9]+/  },
		{id: TOK_IDENT , re: /^[_0-9a-zA-Z]+/ },
		{id: TOK_COMP  , re: /^(<>|<=|>=|==|=|<|>|!=)/ },
		{id: TOK_WS    , re: /^[\t \r\n]+/ },
		{id: TOK_LOGIC , re: /^(\&\&|\|\|)/ }
	];
	
	ExpressionQuery.prototype = {
		parse: function(sourceString) {
			this.sourceString = sourceString;
			this.generateTokenList();
			
			this.generateNodes();
		},
		
		generateTokenList: function() {
			var ls = [];
			for (;;) {
				var tok = this.findHeadToken();
				if (!tok) { break; }
				if (tok.tok_id === TOK_WS) { continue; }
				
				ls.push(tok);
			}
			
			this.tokenList = ls;
			return ls;
		},
		
		generateNodes: function() {
			var ls = [];
			
			this.expecting = EXPECTING_LEFTHAND;
			this.lookingTokenIndex = 0;

			for (var i = 0;i < 999;++i) {
				if (!this.pickToken()) {
					if (this.expecting === EXPECTING_LEFTHAND) {
						// BAD eof
						this.hasError = true;
						return;
					}
					
					break;
				}

				if (this.expecting === EXPECTING_LEFTHAND) {
					var bx = this.buildBinaryExpressionNode();
					if (!bx) {
						this.hasError = true;
						return;
					}
					
					ls.push(bx);
					this.expecting = EXPECTING_LOGICAL;
				} else if (this.expecting === EXPECTING_LOGICAL) {
					var lo = this.buildLogicalOperationNode();
					if (!lo) {
						this.hasError = true;
						return;
					}
					
					ls.push(lo);
					this.expecting = EXPECTING_LEFTHAND;
				}
				
				this.reduce(ls);
			}

			// XXX
			this.rootNode = ls[0] || null;
		},
		
		buildLogicalOperationNode: function() {
			var t1 = this.pickToken();
			if (t1.tok_id !== TOK_LOGIC) {
				return null;
			}

			var op = (t1.content == '&&') ? LogicalOperationNode.OP_AND : LogicalOperationNode.OP_OR;
			++this.lookingTokenIndex;
			return new LogicalOperationNode(op);
		},
		
		buildBinaryExpressionNode: function() {
			var t1 = this.pickToken();
			var t2 = this.pickToken(1);
			var t3 = this.pickToken(2);
			
			if (!t1 || !t2 || !t3) {
				return null;
			}
			
			// token type check
			if (t2.tok_id !== TOK_COMP) {
				return null;
			}
			
			if (t1.tok_id === TOK_IDENT) {
				if (t3.tok_id !== TOK_NUMBER) {
					return null;
				}
			} else if (t3.tok_id === TOK_IDENT) {
				if (t1.tok_id !== TOK_NUMBER) {
					return null;
				}
			} else {
				return null;
			}

			this.lookingTokenIndex += 3;
			return new BinaryExpressionNode(t1, t2, t3);
		},
		
		pickToken: function(offset) {
			return this.tokenList[ this.lookingTokenIndex + (offset || 0) ] || null;
		},
		
		findHeadToken: function() {
			for (var i in lexRegexs) {
				var re = lexRegexs[i].re;
				var tid = lexRegexs[i].id;
				if (re.test(this.sourceString)) {
					var lastMatch = RegExp['$&'];
					var newString = this.sourceString.replace(re, '');
					this.sourceString = newString;
					
					var tokObj = {tok_id: tid, content: lastMatch};
					if (tid === TOK_NUMBER) {
						tokObj.numberValue = parseFloat(tokObj.content);
					}
					
					return tokObj;
				}
			}
			
			return null;
		},
		
		run: function(sourceData, outList, lengthOverride, not_outList) {
			if (!this.rootNode) {
				return -1;
			}
			
			var nFounds = 0;
			var len = sourceData.length;
			
			if (lengthOverride === 0 || lengthOverride) {
				len = lengthOverride;
			}
			
			for (var i = 0;i < len;++i) {
				var record = sourceData[i];
				if (this.rootNode.evaluate(record)) {
					if (outList) {
						outList.push(record);
					}
					
					++nFounds;
				} else {
					if (not_outList) {
						not_outList.push(record);
					}
				}
			}
			
			return nFounds;
		},
		
		reduce: function(nodeList) {
			if (nodeList.length < 3) {
				return;
			}

			if (nodeList[1].isLogicalOperation) {
				this.reduceLogicalOperation(nodeList);
			}
		},
		
		reduceLogicalOperation: function(nodeList) {
			var lh     = nodeList.shift();
			var parent = nodeList.shift();
			var rh     = nodeList.shift();
			
			parent.leftHand = lh;
			parent.rightHand = rh;
			
			nodeList.unshift(parent);
		}
	};
	
	
	// Nodes ========================================
	
	function BinaryExpressionNode(lh, cmp, rh) {
		this.leftHand = lh;
		this.comparator = cmp;
		this.rightHand = rh;
		
		this.functionCache = BinaryExpressionNode.getComparatorFunction(this.comparator.content);
	}
	
	BinaryExpressionNode.prototype.evaluate = function(record) {
		var func = this.functionCache;
		var lv = this.getValueFromToken(this.leftHand, record);
		var rv = this.getValueFromToken(this.rightHand, record);
		return func(lv, rv);
	};
	
	BinaryExpressionNode.prototype.getValueFromToken = function(tok, context) {
		if (tok.tok_id === TOK_NUMBER) {
			return tok.numberValue;
		}
		
		if (tok.tok_id === TOK_IDENT) {
			return context[ tok.content ];
		}
		
		return null;
	};
	
	BinaryExpressionNode.getComparatorFunction = function(op) {
		switch(op) {
			case '=':
			case '==':
				return function(a,b) { return (a === b); } ;

			case '<>':
			case '!=':
				return function(a,b) { return (a !== b); } ;

			case '<':
				return function(a,b) { return (a < b); } ;

			case '>':
				return function(a,b) { return (a > b); } ;

			case '<=':
				return function(a,b) { return (a <= b); } ;

			case '>=':
				return function(a,b) { return (a >= b); } ;
		}
		
		return null;
	};
	
	
	function LogicalOperationNode(op) {
		this.operation = op;
		this.leftHand  = null;
		this.rightHand = null;
		
		this.isLogicalOperation = true;
	}
	
	LogicalOperationNode.prototype.evaluate = function(record) {
		var r1 = this.leftHand.evaluate(record);
		var r2 = this.rightHand.evaluate(record);
		
		if (this.operation === LogicalOperationNode.OP_AND) {
			return r1 && r2;
		} else {
			return r1 || r2;
		}
	};
	
	
	LogicalOperationNode.OP_AND = 0;
	LogicalOperationNode.OP_OR  = 1;
	
	window.mobmap.ExpressionQuery = ExpressionQuery;
})();