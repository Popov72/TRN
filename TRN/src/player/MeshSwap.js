TRN.MeshSwap = function(obj1, obj2) {
	
	this.obj1 = obj1;
	this.geometry = obj1.geometry;
	this.materials = obj1.material.materials;
	this.attributes = this.materials[0].attributes;

	this.obj2 = obj2;
	this.geometrySrc = obj2.geometry;
	this.materialsSrc = obj2.material.materials;
	this.attributesSrc = this.materialsSrc[0].attributes;

}

TRN.MeshSwap.prototype = {

	constructor : TRN.MeshSwap,

	swap : function (meshIndices) {
return;
		for (var i = 0; i < meshIndices.length; ++i) {
			// remove the data from the obj1 and obj2
			var data1 = this.removeData(this.geometry, this.attributes, meshIndices[i]);
			var data2 = this.removeData(this.geometrySrc, this.attributesSrc, meshIndices[i]);

			// inject the data into obj1 and obj2
			this.addData(this.obj1, data2, this.materialsSrc);
			this.addData(this.obj2, data1, this.materials);

			this.materials = this.obj1.material.materials;
			this.attributes = this.materials[0].attributes;

			this.materialsSrc = this.obj2.material.materials;
			this.attributesSrc = this.materialsSrc[0].attributes;
		}

	},

	swapall : function() {
return;
		var g = this.obj1.geometry, m = this.obj1.material;

		this.obj1.geometry = this.obj2.geometry;
		this.obj1.material = this.obj2.material;

		this.obj2.geometry = g;
		this.obj2.material = m;

		delete this.obj1.__webglInit; // make three js regenerates the webgl buffers
		delete this.obj2.__webglInit;
	},

	findIndices : function (geometry, meshIdx) {

		// get the start and end index of this mesh in the skin indices/weights/vertices buffers
		var startIndex = -1, endIndex = -1;

		for (var i = 0; i < geometry.skinIndices.length; ++i) {

			if (geometry.skinIndices[i].x == meshIdx) {

				if (startIndex == -1) startIndex = i;

			} else if (startIndex != -1) {

				endIndex = i-1;
				break;

			}

		}

		if (endIndex == -1) endIndex = geometry.skinIndices.length-1;

		// get start and end index of this mesh in the face / uv buffers
		var startIndex2 = -1, endIndex2 = -1;

		for (var i = 0; i < geometry.faces.length; ++i) {

			var face = geometry.faces[i];

			if ((face.a >= startIndex && face.a <= endIndex) ||
				(face.b >= startIndex && face.b <= endIndex) ||
				(face.c >= startIndex && face.c <= endIndex) ||
				(face.d >= startIndex && face.d <= endIndex)) {

				if (startIndex2 == -1) startIndex2 = i;

			} else if (startIndex2 != -1) {

				endIndex2 = i-1;
				break;

			}

		}

		if (endIndex2 == -1) endIndex2 = geometry.faces.length-1;

		return { startIndexVertices: startIndex, endIndexVertices: endIndex, startIndexFaces: startIndex2, endIndexFaces: endIndex2 };

	},

	removeData : function (geometry, attributes, meshIndex) {

		var indices = this.findIndices(geometry, meshIndex);

		var numVerticesRemoved = indices.endIndexVertices - indices.startIndexVertices + 1;
		var numFacesRemoved = indices.endIndexFaces - indices.startIndexFaces + 1;

		var vertices = geometry.vertices.splice(indices.startIndexVertices, numVerticesRemoved);
		var skinIndices = geometry.skinIndices.splice(indices.startIndexVertices, numVerticesRemoved);
		var skinWeights = geometry.skinWeights.splice(indices.startIndexVertices, numVerticesRemoved);
		var faces = geometry.faces.splice(indices.startIndexFaces, numFacesRemoved);
		var faceVertexUvs = geometry.faceVertexUvs[0].splice(indices.startIndexFaces, numFacesRemoved);

		var attributes1 = {};
		for (var attrname in attributes) {
			if (!attributes.hasOwnProperty(attrname)) continue;

			var o = attributes[attrname];

			if (o.value && o.value.length) {

				attributes1[attrname] = o.value.splice(indices.startIndexVertices, numVerticesRemoved);
				o.needsUpdate = true;

			}
		}

		for (var i = indices.startIndexFaces; i < geometry.faces.length; ++i) {
			var face = geometry.faces[i];

			face.a -= numVerticesRemoved;
			face.b -= numVerticesRemoved;
			face.c -= numVerticesRemoved;

			if (face instanceof THREE.Face4) face.d -= numVerticesRemoved;
		}

		return {
			startIndexVertices: indices.startIndexVertices,
			vertices: 			vertices,
			skinIndices: 		skinIndices,
			skinWeights: 		skinWeights,
			faces: 				faces,
			faceVertexUvs: 		faceVertexUvs,
			attributes: 		attributes1
		};

	},

	addData : function (obj1, data2, materialsSrc) {

		var geometry = obj1.geometry;
		var materials = obj1.material.materials;
		var attributes = materials[0].attributes;

		var startIndexVertices2 = data2.startIndexVertices;
		var vertices2 = data2.vertices, skinIndices2 = data2.skinIndices, skinWeights2 = data2.skinWeights;
		var faces2 = data2.faces, faceVertexUvs2 = data2.faceVertexUvs, attributes2 = data2.attributes;

		var numVertices1 = geometry.vertices.length;

		geometry.vertices = geometry.vertices.concat(vertices2);
		geometry.skinIndices = geometry.skinIndices.concat(skinIndices2);
		geometry.skinWeights = geometry.skinWeights.concat(skinWeights2);

		var numFaces = geometry.faces.length;

		geometry.faces = geometry.faces.concat(faces2);
		geometry.faceVertexUvs[0] = geometry.faceVertexUvs[0].concat(faceVertexUvs2);

		for (var i = numFaces; i < geometry.faces.length; ++i) {
			var face = geometry.faces[i];

			face.a = face.a - startIndexVertices2 + numVertices1;
			face.b = face.b - startIndexVertices2 + numVertices1;
			face.c = face.c - startIndexVertices2 + numVertices1;

			if (face instanceof THREE.Face4) face.d = face.d - startIndexVertices2 + numVertices1;

			face.materialIndex += materials.length;
		}

		for (var attrname in attributes) {

			if (!attributes.hasOwnProperty(attrname)) continue;

			var o = attributes[attrname], osrc = attributes2[attrname];

			o.value = o.value.concat(osrc);

		}

		// add the materials from the second object to the first one
		// Note: we assume that the materials can differ only by the map !
		for (var i = 0; i < materialsSrc.length; ++i) {
			var material = materials[0].clone();
			material.attributes = attributes;
			material.userData = {};
			material.uniforms.map.value = materialsSrc[i].uniforms.map.value;
			materials.push(material);
		}

		// build a new material list by removing the duplicates from the current material list
		var mapMaterial = {}, newMaterialList = [];
		for (var i = 0; i < materials.length; ++i) {
			var material = materials[i];
			if (!mapMaterial[material.uniforms.map.value.id]) {
				newMaterialList.push(material);
				mapMaterial[material.uniforms.map.value.id] = newMaterialList.length;
			}
		}

		// update the material indices in the faces
		for (var i = 0; i < geometry.faces.length; ++i) {
			var face = geometry.faces[i];

			face.materialIndex = mapMaterial[materials[face.materialIndex].uniforms.map.value.id]-1;
		}

		obj1.material.materials = newMaterialList;

		geometry.verticesNeedUpdate = true;
		geometry.elementsNeedUpdate = true;
		geometry.uvsNeedUpdate = true;
		geometry.normalsNeedUpdate = true;

		geometry.dispose();

		//delete geometry.geometryGroups;
		//delete geometry.__webglInit;
		delete obj1.__webglInit;

	}

}

