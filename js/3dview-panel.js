(function (aGlobal) {
	function ThreeDViewMapPanel(gl) {
		this.gl = gl;

		this.vbPoss = null;
		this.possSrcArray = null;

		this.vbTexCoords = null;
		this.tcSrcArray = null;

		this.vbColors = null;
		this.clrSrcArray = null;

		this.generateVertexBuffer(this.gl, -1.0, 1.0);
		this.generateTextureCoordBuffer(this.gl);
		this.generateColorBuffer(this.gl, 1,1,1,1);
		console.log(this.vbPoss, this.possSrcArray, this.vbTexCoords);
	}
	
	ThreeDViewMapPanel.prototype = {
		generateVertexBuffer: function(gl, minPos, maxPos) {
			// Vertex Buffer Object
			var vb = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vb);

			// Vertex Buffer Source
			var poss = new Float32Array([
			//   X   Y   Z
			    minPos,  0, minPos,
			    maxPos,  0, minPos,
			    maxPos,  0, maxPos,
			    minPos,  0, maxPos]
			);

			gl.bufferData(gl.ARRAY_BUFFER, poss, gl.STATIC_DRAW);
			
			// Retain
			this.vbPoss = vb;
			this.possSrcArray = poss;

//			gl.vertexAttribPointer(loc_pos, 2, gl.FLOAT, false, 0, 0);
		},
		
		generateTextureCoordBuffer: function(gl) {
			// Vertex Buffer Object
			var vb = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vb);

			// Vertex Buffer Source
			var uvs = new Float32Array([
			//  U  V
			    0, 0,
			    1, 0,
			    1, 1,
			    0, 1]
			);

			gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

			// Retain
			this.vbTexCoords = vb;
			this.tcSrcArray = uvs;
		},
		
		generateColorBuffer: function(gl, fR,fG,fB,fA) {
			// Vertex Buffer Object
			var vb = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vb);

			// Vertex Buffer Source
			var clrs = new Float32Array([
			//   R  G  B  A
			    fR,fG,fB,fA,
			    fR,fG,fB,fA,
			    fR,fG,fB,fA,
			    fR,fG,fB,fA]
			);
			
			gl.bufferData(gl.ARRAY_BUFFER, clrs, gl.STATIC_DRAW);

			this.vbColors = vb;
			this.clrSrcArray = clrs;
		},
		
		prepareShaderData: function(shaderParams) {
			var gl = this.gl;

			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbPoss);
			gl.vertexAttribPointer(shaderParams.aPosition, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shaderParams.aPosition);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbTexCoords);
			gl.vertexAttribPointer(shaderParams.aTexCoord, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shaderParams.aTexCoord);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbColors);
			gl.vertexAttribPointer(shaderParams.aColor, 4, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(shaderParams.aColor);
		}
	};
	
	aGlobal.ThreeDViewMapPanel = ThreeDViewMapPanel;
})(window);