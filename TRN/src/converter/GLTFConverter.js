"use strict";
var TRNUtil;
(function (TRNUtil) {
    var worldScale = 1 / 512.0;
    var bufferViewTarget;
    (function (bufferViewTarget) {
        bufferViewTarget[bufferViewTarget["ARRAY_BUFFER"] = 34962] = "ARRAY_BUFFER";
        bufferViewTarget[bufferViewTarget["ELEMENT_ARRAY_BUFFER"] = 34963] = "ELEMENT_ARRAY_BUFFER";
    })(bufferViewTarget || (bufferViewTarget = {}));
    ;
    var accessorElementSize;
    (function (accessorElementSize) {
        accessorElementSize[accessorElementSize["BYTE"] = 5120] = "BYTE";
        accessorElementSize[accessorElementSize["UNSIGNED_BYTE"] = 5121] = "UNSIGNED_BYTE";
        accessorElementSize[accessorElementSize["SHORT"] = 5122] = "SHORT";
        accessorElementSize[accessorElementSize["UNSIGNED_SHORT"] = 5123] = "UNSIGNED_SHORT";
        accessorElementSize[accessorElementSize["UNSIGNED_INT"] = 5125] = "UNSIGNED_INT";
        accessorElementSize[accessorElementSize["FLOAT"] = 5126] = "FLOAT";
    })(accessorElementSize || (accessorElementSize = {}));
    ;
    var accessorType;
    (function (accessorType) {
        accessorType["SCALAR"] = "SCALAR";
        accessorType["VEC2"] = "VEC2";
        accessorType["VEC3"] = "VEC3";
        accessorType["VEC4"] = "VEC4";
        accessorType["MAT2"] = "MAT2";
        accessorType["MAT3"] = "MAT3";
        accessorType["MAT4"] = "MAT4";
    })(accessorType || (accessorType = {}));
    ;
    var primitiveMode;
    (function (primitiveMode) {
        primitiveMode[primitiveMode["POINTS"] = 0] = "POINTS";
        primitiveMode[primitiveMode["LINES"] = 1] = "LINES";
        primitiveMode[primitiveMode["LINE_LOOP"] = 2] = "LINE_LOOP";
        primitiveMode[primitiveMode["LINE_STRIP"] = 3] = "LINE_STRIP";
        primitiveMode[primitiveMode["TRIANGLES"] = 4] = "TRIANGLES";
        primitiveMode[primitiveMode["TRIANGLE_STRIP"] = 5] = "TRIANGLE_STRIP";
        primitiveMode[primitiveMode["TRIANGLE_FAN"] = 6] = "TRIANGLE_FAN";
    })(primitiveMode || (primitiveMode = {}));
    var samplerMagFilter;
    (function (samplerMagFilter) {
        samplerMagFilter[samplerMagFilter["NEAREST"] = 9728] = "NEAREST";
        samplerMagFilter[samplerMagFilter["LINEAR"] = 9729] = "LINEAR";
    })(samplerMagFilter || (samplerMagFilter = {}));
    var samplerMinFilter;
    (function (samplerMinFilter) {
        samplerMinFilter[samplerMinFilter["NEAREST"] = 9728] = "NEAREST";
        samplerMinFilter[samplerMinFilter["LINEAR"] = 9729] = "LINEAR";
        samplerMinFilter[samplerMinFilter["NEAREST_MIPMAP_NEAREST"] = 9984] = "NEAREST_MIPMAP_NEAREST";
        samplerMinFilter[samplerMinFilter["LINEAR_MIPMAP_NEAREST"] = 9985] = "LINEAR_MIPMAP_NEAREST";
        samplerMinFilter[samplerMinFilter["NEAREST_MIPMAP_LINEAR"] = 9986] = "NEAREST_MIPMAP_LINEAR";
        samplerMinFilter[samplerMinFilter["LINEAR_MIPMAP_LINEAR"] = 9987] = "LINEAR_MIPMAP_LINEAR";
    })(samplerMinFilter || (samplerMinFilter = {}));
    var samplerWrap;
    (function (samplerWrap) {
        samplerWrap[samplerWrap["CLAMP_TO_EDGE"] = 33071] = "CLAMP_TO_EDGE";
        samplerWrap[samplerWrap["MIRRORED_REPEAT"] = 33648] = "MIRRORED_REPEAT";
        samplerWrap[samplerWrap["REPEAT"] = 10497] = "REPEAT";
    })(samplerWrap || (samplerWrap = {}));
    var GLTFConverter = /** @class */ (function () {
        function GLTFConverter(trLevel, sceneJSON) {
            this.trLevel = trLevel;
            this.sceneJSON = sceneJSON;
            this._nodes = [];
            this._inodes = [];
            this._meshes = [];
            this._buffers = [];
            this._bufferViews = [];
            this._accessors = [];
            this._materials = [];
            this._gltf = {
                "asset": {
                    "version": "2.0",
                    "generator": "TRN",
                },
                "extensionsUsed": [
                    "KHR_materials_unlit",
                ],
                "nodes": this._nodes,
                "scenes": [
                    {
                        "name": sceneJSON.levelShortFileName,
                        "nodes": this._inodes,
                    }
                ],
                "scene": 0,
                "meshes": this._meshes,
                "buffers": this._buffers,
                "bufferViews": this._bufferViews,
                "accessors": this._accessors,
                "materials": this._materials,
            };
            this.__objects = this.sceneJSON.objects;
            this.__embeds = this.sceneJSON.embeds;
            this.__geometries = this.sceneJSON.geometries;
            this._cameraNode = null;
        }
        Object.defineProperty(GLTFConverter.prototype, "data", {
            get: function () {
                return this._gltf;
            },
            enumerable: true,
            configurable: true
        });
        GLTFConverter.prototype.convert = function () {
            glMatrix.glMatrix.setMatrixArrayType(Array);
            this.outputTextures();
            this.outputCamera();
            this.outputSky();
            this.outputRooms();
        };
        GLTFConverter.prototype.addNode = function (name, addToRootNodes, rotation, translation, scale) {
            if (addToRootNodes === void 0) { addToRootNodes = false; }
            var node = {
                name: name, rotation: rotation, scale: scale, translation: translation
            }, index = this._nodes.length;
            if (node.translation) {
                node.translation = [node.translation[0] * worldScale, node.translation[1] * worldScale, node.translation[2] * worldScale];
            }
            this._nodes.push(node);
            if (addToRootNodes)
                this._inodes.push(index);
            return { node: node, index: index };
        };
        GLTFConverter.prototype.addChildToNode = function (src, child) {
            (src.children = src.children || []).push(child);
        };
        GLTFConverter.prototype.addBuffer = function (buf, bufByteLen, name) {
            if (typeof buf !== "string") {
                bufByteLen = buf.byteLength;
                buf = "data:application/octet-stream;base64," + TRN.Base64Binary.encode(buf);
            }
            this._buffers.push({
                "name": name,
                "byteLength": bufByteLen,
                "uri": buf,
            });
            return this._buffers.length - 1;
        };
        GLTFConverter.prototype.addBufferView = function (obj) {
            return this._bufferViews.push(obj), this._bufferViews.length - 1;
        };
        GLTFConverter.prototype.addAccessor = function (obj) {
            return this._accessors.push(obj), this._accessors.length - 1;
        };
        GLTFConverter.prototype.addMesh = function (obj) {
            return this._meshes.push(obj), this._meshes.length - 1;
        };
        GLTFConverter.prototype.addMaterial = function (obj) {
            return this._materials.push(obj), this._materials.length - 1;
        };
        GLTFConverter.prototype.outputTextures = function () {
            this._gltf.samplers = [
                {
                    "magFilter": samplerMagFilter.LINEAR,
                    "minFilter": samplerMinFilter.LINEAR_MIPMAP_LINEAR,
                    "wrapS": samplerWrap.CLAMP_TO_EDGE,
                    "wrapT": samplerWrap.CLAMP_TO_EDGE,
                },
                {
                    "magFilter": samplerMagFilter.LINEAR,
                    "minFilter": samplerMinFilter.LINEAR_MIPMAP_LINEAR,
                    "wrapS": samplerWrap.REPEAT,
                    "wrapT": samplerWrap.REPEAT,
                }
            ];
            var textures = this.sceneJSON.textures;
            var otextures = [], oimages = [];
            for (var name_1 in textures) {
                var data = textures[name_1].url;
                var dataLen = 3 * Math.ceil((data.length - data.indexOf(',') - 1) / 4);
                if (data.charAt(data.length - 1) == '=' && data.charAt(data.length - 2) == '=')
                    dataLen -= 2;
                else if (data.charAt(data.length - 1) == '=')
                    dataLen--;
                data = data.replace("image/png", "application/octet-stream");
                otextures.push({
                    "sampler": (this.sceneJSON.rversion == 'TR4' && name_1 == 'texture' + (TRN.Helper.objSize(textures) - 1)) ? 1 : 0,
                    "source": oimages.length,
                });
                oimages.push({
                    "bufferView": this.addBufferView({
                        "name": "texture " + name_1,
                        "buffer": this.addBuffer(data, dataLen, "texture " + name_1 + " data"),
                        "byteLength": dataLen,
                        "byteOffset": 0,
                    }),
                    "mimeType": "image/png",
                });
            }
            this._gltf.images = oimages;
            this._gltf.textures = otextures;
        };
        GLTFConverter.prototype.outputCamera = function () {
            var cam = this.__objects.camera1;
            this._cameraNode = this.addNode("Camera", true, cam.quaternion, cam.position).node;
            this._cameraNode.camera = 0;
            this._gltf.cameras = [
                {
                    "type": "perspective",
                    "perspective": {
                        "aspectRatio": 1.0,
                        "yfov": cam.fov * Math.PI / 180,
                        "zfar": cam.far * worldScale,
                        "znear": cam.near * worldScale,
                    }
                }
            ];
        };
        GLTFConverter.prototype.outputSky = function () {
            if (this.sceneJSON.rversion != 'TR4')
                return;
            var meshNode = this.createMesh("skydome", true);
            if (meshNode != null) {
                meshNode.node.translation = this._cameraNode.translation;
            }
        };
        GLTFConverter.prototype.outputRooms = function () {
            var rootNode = this.addNode("rootNode", true);
            for (var name_2 in this.__objects) {
                var obj = this.__objects[name_2];
                var geom = this.__geometries[obj.geometry];
                if (!obj.visible) {
                    //console.log('Object/Mesh ' + name + ' not visible');
                    continue;
                }
                if (geom !== undefined && "id" in geom) {
                    //if (name.substring(0, 4) != 'room') { continue; }
                    var meshNode = this.createMesh(name_2);
                    if (meshNode != null) {
                        this.addChildToNode(rootNode.node, meshNode.index);
                    }
                }
                else {
                    //console.log(name, obj, geom);
                }
            }
        };
        GLTFConverter.prototype.createMesh = function (objName, addAsRootNode) {
            if (addAsRootNode === void 0) { addAsRootNode = false; }
            var obj = this.__objects[objName];
            var materials = obj.material;
            var oembed = this.__embeds[this.__geometries[obj.geometry].id];
            var mesh = {
                "name": objName + " mesh",
                "primitives": []
            };
            var vertices = oembed.vertices, uvs = oembed.uvs[0], colors = oembed.colors;
            var faces = oembed.faces, numFaces3 = 0, numFaces4 = 0;
            if (materials.length == 0 || faces.length == 0) {
                console.log('No materials and/or no faces on ' + objName + ': object not exported. ', obj, oembed);
                return null;
            }
            var f = 0;
            while (f < faces.length) {
                var ftype = faces[f];
                if (ftype & 1) {
                    f += 14;
                    numFaces4++;
                }
                else {
                    f += 11;
                    numFaces3++;
                }
            }
            //console.log(f, faces.length);
            var numVertices = numFaces3 * 3 + numFaces4 * 4, numTriangles = numFaces3 + numFaces4 * 2;
            var verticesSize = numVertices * 3 * 4, textcoordsSize = numVertices * 2 * 4, colorsSize = numVertices * 3 * 4, indicesSize = numTriangles * 3 * 2;
            var bufferData = new ArrayBuffer(verticesSize + textcoordsSize + colorsSize + indicesSize);
            var attributesView = new Float32Array(bufferData, 0, numVertices * (3 + 2 + 3));
            var min = [1e20, 1e20, 1e20], max = [-1e20, -1e20, -1e20];
            var ofst = 0;
            f = 0;
            while (f < faces.length) {
                var isTri = (faces[f] & 1) == 0, numVert = isTri ? 3 : 4, faceSize = isTri ? 11 : 14;
                for (var v = 0; v < numVert; ++v) {
                    var _a = [vertices[faces[f + v + 1] * 3 + 0] * worldScale, vertices[faces[f + v + 1] * 3 + 1] * worldScale, vertices[faces[f + v + 1] * 3 + 2] * worldScale], x = _a[0], y = _a[1], z = _a[2];
                    min[0] = Math.min(min[0], x);
                    min[1] = Math.min(min[1], y);
                    min[2] = Math.min(min[2], z);
                    max[0] = Math.max(max[0], x);
                    max[1] = Math.max(max[1], y);
                    max[2] = Math.max(max[2], z);
                    attributesView.set([x, y, z], ofst);
                    attributesView.set([uvs[faces[f + v + numVert + 2] * 2 + 0], uvs[faces[f + v + numVert + 2] * 2 + 1]], ofst + 3);
                    var color = colors[faces[f + v + 1]], cr = (color & 0xFF0000) >> 16, cg = (color & 0xFF00) >> 8, cb = (color & 0xFF);
                    attributesView.set([cr / 255.0 / 2, cg / 255.0 / 2, cb / 255.0 / 2], ofst + 5);
                    ofst += 8;
                }
                f += faceSize;
            }
            //console.log(f, faces.length);
            //console.log(ofst*4, verticesSize + textcoordsSize)
            var indicesView = new Uint16Array(bufferData, verticesSize + textcoordsSize + colorsSize, numTriangles * 3);
            var accessorOffsets = [], accessorCounts = [];
            for (var mat = 0, ofst_1 = 0; mat < materials.length; ++mat) {
                accessorOffsets.push(ofst_1 * 2);
                var fIndex = 0;
                f = 0;
                while (f < faces.length) {
                    var isTri = (faces[f] & 1) == 0, faceSize = isTri ? 11 : 14;
                    var faceMat = faces[f + (isTri ? 4 : 5)];
                    if (faceMat == mat) {
                        if (!isTri) {
                            indicesView.set([fIndex + 0, fIndex + 1, fIndex + 3], ofst_1);
                            indicesView.set([fIndex + 1, fIndex + 2, fIndex + 3], ofst_1 + 3);
                            ofst_1 += 6;
                        }
                        else {
                            indicesView.set([fIndex + 0, fIndex + 1, fIndex + 2], ofst_1);
                            ofst_1 += 3;
                        }
                    }
                    fIndex += 3;
                    if (!isTri)
                        fIndex++;
                    f += faceSize;
                }
                accessorCounts.push((ofst_1 * 2 - accessorOffsets[mat]) / 2);
            }
            //console.log(f, faces.length);
            var bufferDataIndex = this.addBuffer(bufferData, undefined, objName + " mesh data");
            var bufferViewAttributesIndex = this.addBufferView({
                "name": objName + "_vertices_attributes",
                "buffer": bufferDataIndex,
                "byteLength": numVertices * (3 + 2 + 3) * 4,
                "byteOffset": 0,
                "byteStride": (3 + 2 + 3) * 4,
                "target": bufferViewTarget.ARRAY_BUFFER,
            });
            var bufferViewIndicesIndex = this.addBufferView({
                "name": objName + "_indices",
                "buffer": bufferDataIndex,
                "byteLength": numTriangles * 3 * 2,
                "byteOffset": verticesSize + textcoordsSize + colorsSize,
                "target": bufferViewTarget.ELEMENT_ARRAY_BUFFER,
            });
            var accessorPositionIndex = this.addAccessor({
                "name": objName + "_position",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": 0,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC3,
                "min": min,
                "max": max,
            });
            var accessorTexcoordIndex = this.addAccessor({
                "name": objName + "_textcoord",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": 3 * 4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC2,
            });
            var accessorColorIndex = this.addAccessor({
                "name": objName + "_vertexcolor",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": 5 * 4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC3,
            });
            for (var mat = 0; mat < materials.length; ++mat) {
                var material = materials[mat], map = material.uniforms.map;
                var numTexture = map ? parseInt(map.value) : -1;
                var accessorIndicesIndex = this.addAccessor({
                    "name": objName + "_material" + mat + "_indices",
                    "bufferView": bufferViewIndicesIndex,
                    "byteOffset": accessorOffsets[mat],
                    "componentType": accessorElementSize.UNSIGNED_SHORT,
                    "count": accessorCounts[mat],
                    "type": accessorType.SCALAR,
                });
                var gmaterial = {
                    "name": objName + " material " + mat,
                    "pbrMetallicRoughness": {
                        "baseColorFactor": [1, 1, 1, 1],
                    },
                    "extensions": {
                        "KHR_materials_unlit": {}
                    },
                };
                if (numTexture >= 0)
                    gmaterial.pbrMetallicRoughness.baseColorTexture = { "index": numTexture };
                if (material.hasAlpha) {
                    gmaterial.alphaMode = "BLEND";
                }
                else {
                    gmaterial.alphaMode = "MASK";
                    gmaterial.alphaCutoff = 0.5;
                }
                var primitive = {
                    "attributes": {
                        "POSITION": accessorPositionIndex,
                        "TEXCOORD_0": accessorTexcoordIndex,
                        "COLOR_0": accessorColorIndex,
                    },
                    "indices": accessorIndicesIndex,
                    "mode": primitiveMode.TRIANGLES,
                    "material": this.addMaterial(gmaterial),
                };
                mesh.primitives.push(primitive);
            }
            var meshNode = this.addNode(objName, addAsRootNode, obj.quaternion, obj.position, obj.scale);
            meshNode.node.mesh = this.addMesh(mesh);
            return meshNode;
        };
        return GLTFConverter;
    }());
    TRNUtil.GLTFConverter = GLTFConverter;
})(TRNUtil || (TRNUtil = {}));
//# sourceMappingURL=GLTFConverter.js.map