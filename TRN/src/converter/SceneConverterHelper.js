function createNewJSONEmbed() {
	return {
		"metadata" : {
			"formatVersion" : 3
		},
		"scale" : 1.0,
		"materials": [],
		"vertices": [],
		"morphTargets": [],
		"normals": [],
		"colors": [],
		"uvs": [[]],
		"faces": []
	};
}

function makeFace(obj, vertices, isQuad, tiles2material, texture, tex, ofstvert, mapObjTexture2AnimTexture, fidx) {
	obj.faces.push(isQuad ? 139 : 138); // 1=quad / 2=has material / 8=has vertex uv / 128=has vertex color

	// vertex indices
	for (var v = 0; v < vertices.length; ++v) {
		obj.faces.push(vertices[fidx(v)] + ofstvert);
	}

	// material
	var imat, anmTexture = false;
	if (mapObjTexture2AnimTexture[texture]) {
		var animTexture = mapObjTexture2AnimTexture[texture];
		var matName = 'anmtext_' + animTexture.idxAnimatedTexture + '_' + animTexture.pos;
		imat = tiles2material[matName];
		if (typeof(imat) == 'undefined') {
			imat = TRN.objSize(tiles2material);
			tiles2material[matName] = imat;
		}
		anmTexture = true;
	} else {
		imat = tiles2material[tex.tile];
		if (typeof(imat) == 'undefined') {
			imat = TRN.objSize(tiles2material);
			tiles2material[tex.tile] = imat;
		}
	}
	obj.faces.push(imat); // index of material

	// texture coords
	var minU = 0, minV = 0;
	if (anmTexture) {
		minU = minV = 1;
		for (var tv = 0; tv < vertices.length; ++tv) {
			var u = (tex.vertices[fidx(tv)].Xpixel + tex.vertices[fidx(tv)].Xcoordinate) / 255.0;
			var v = 1.0 - (tex.vertices[fidx(tv)].Ypixel + tex.vertices[fidx(tv)].Ycoordinate) / 255.0;
			if (minU > u) minU = u;
			if (minV > v) minV = v;
		}
	}
	var numUVs = parseInt(obj.uvs[0].length / 2);
	for (var tv = 0; tv < vertices.length; ++tv) {
		obj.faces.push(numUVs++);
		var u = (tex.vertices[fidx(tv)].Xpixel + tex.vertices[fidx(tv)].Xcoordinate) / 255.0;
		var v = 1.0 - (tex.vertices[fidx(tv)].Ypixel + tex.vertices[fidx(tv)].Ycoordinate) / 255.0;
		obj.uvs[0].push(u - minU, v - minV);
	}

	// vertex colors
	for (var v = 0; v < vertices.length; ++v) {
		obj.faces.push(vertices[fidx(v)] + ofstvert);
	}
}

function makeFaces(obj, facearrays, tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert) {
	for (var a = 0; a < facearrays.length; ++a) {
		var lstface = facearrays[a];
		for (var i = 0; i < lstface.length; ++i) {
			var o = lstface[i];
			var vertices = o.vertices, texture = o.texture & 0x7FFF, twoSided = (o.texture & 0x8000) != 0, tex = objectTextures[texture];
			var isQuad = vertices.length == 4;
			makeFace(obj, vertices, isQuad, tiles2material, texture, tex, ofstvert, mapObjTexture2AnimTexture, function(idx) { return vertices.length-1-idx; });
			if (twoSided) {
				makeFace(obj, vertices, isQuad, tiles2material, texture, tex, ofstvert, mapObjTexture2AnimTexture, function(idx) { return idx; });
			}
		}
	}
}

function makeMeshGeometry(mesh, meshnum, meshJSON, tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert, attributes, skinidx, skinIndices, skinWeights) {
	if (mesh.lights.length > 0) {
		// mesh is internally lit
		if (mesh.lights.length != mesh.vertices.length) {
			console.error(' mesh #', meshnum, mesh, '=> lights.length != vertices.length ! mesh skipped');
			return;
		}

		// push the vertices + vertex colors of the mesh
		for (var v = 0; v < mesh.vertices.length; ++v) {
			var vertex = mesh.vertices[v], lighting = 1.0 - mesh.lights[v]/8192.0;

			var vcolor = parseInt(lighting*255);

			meshJSON.vertices.push(vertex.x, -vertex.y, -vertex.z);
			meshJSON.colors.push(vcolor + (vcolor << 8) + (vcolor << 16));

			if (attributes)  attributes.flags.value.push(new THREE.Vector4(0, 0, 0, lighting));
			if (skinIndices) skinIndices.push(skinidx, skinidx);
			if (skinWeights) skinWeights.push(1.0, 1.0);
		}

		makeFaces(meshJSON, [mesh.texturedRectangles, mesh.texturedTriangles], tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert);

	} else {
		// mesh is internally lit
		// todo: handles according to lights in the room

		// push the vertices + vertex colors of the mesh
		for (var v = 0; v < mesh.vertices.length; ++v) {
			var vertex = mesh.vertices[v], lighting = 1.0;

			var vcolor = parseInt(lighting*255);

			meshJSON.vertices.push(vertex.x, -vertex.y, -vertex.z);
			meshJSON.colors.push(vcolor + (vcolor << 8) + (vcolor << 16));

			if (attributes)  attributes.flags.value.push(new THREE.Vector4(0, 0, 0, lighting));
			if (skinIndices) skinIndices.push(skinidx, skinidx);
			if (skinWeights) skinWeights.push(1.0, 1.0);
		}

		makeFaces(meshJSON, [mesh.texturedRectangles, mesh.texturedTriangles], tiles2material, objectTextures, mapObjTexture2AnimTexture, ofstvert);
	}

	return mesh.lights.length > 0;
}

function makeMaterialList(tiles2material, attributes, matname) {
	if (!matname) matname = 'room';
	var lstMat = [];
	for (var tile in tiles2material) {
		var imat = tiles2material[tile];
		var isAnimText = tile.substr(0, 7) == 'anmtext';
		lstMat[imat] = {
			"material": "TR_" + matname,
			"attributes": attributes,
			"userData": {}
		};
		if (isAnimText) {
			lstMat[imat].userData.animatedTexture = {
				"idxAnimatedTexture": parseInt(tile.split('_')[1]),
				"pos": parseInt(tile.split('_')[2])
			};
		} else {
			lstMat[imat].uniforms = {
				"map": { type: "t", value: "texture" + tile }
			};
		}
	}
	return lstMat;
}

function findStatichMeshByID(trlevel, objectID) {
	var gstaticMesh = null;
	for (var sg = 0; sg < trlevel.staticMeshes.length; ++sg) {
		if (trlevel.staticMeshes[sg].objectID == objectID) {
			return trlevel.staticMeshes[sg];
		}
	}
	return null;
}
