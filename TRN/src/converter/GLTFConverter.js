"use strict";
var TRNUtil;
(function (TRNUtil) {
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
    var channelTargetPath;
    (function (channelTargetPath) {
        channelTargetPath["translation"] = "translation";
        channelTargetPath["rotation"] = "rotation";
        channelTargetPath["scale"] = "scale";
        channelTargetPath["weights"] = "weights";
    })(channelTargetPath || (channelTargetPath = {}));
    var samplerInterpolation;
    (function (samplerInterpolation) {
        samplerInterpolation["LINEAR"] = "LINEAR";
        samplerInterpolation["STEP"] = "STEP";
        samplerInterpolation["CUBICSPLINE"] = "CUBICSPLINE";
    })(samplerInterpolation || (samplerInterpolation = {}));
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
            this._skins = [];
            this._animations = [];
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
                        "extras": {
                            "TRN_materials": jQuery.extend(true, {}, sceneJSON.materials),
                        },
                    }
                ],
                "scene": 0,
                "meshes": this._meshes,
                "buffers": this._buffers,
                "bufferViews": this._bufferViews,
                "accessors": this._accessors,
                "materials": this._materials,
                "skins": this._skins,
                "animations": this._animations,
            };
            this.__objects = this.sceneJSON.objects;
            this.__embeds = this.sceneJSON.embeds;
            this.__geometries = this.sceneJSON.geometries;
            this.__animatedTextures = this.sceneJSON.animatedTextures;
            this.__animTracks = this.sceneJSON.animTracks;
            this._cameraNode = null;
            this._glc = 0;
            this._mapNameToGeometry = {};
            this._mapNameToSkin = {};
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
            this.outputObjects();
            this.outputMaterials();
            this.outputAnimations();
            console.log("GLTF Converter: Number of meshes without textures=" + this._glc);
        };
        GLTFConverter.prototype.addNode = function (name, addToRootNodes, rotation, translation, scale) {
            if (addToRootNodes === void 0) { addToRootNodes = false; }
            var node = {
                name: name, rotation: rotation, scale: scale, translation: translation
            }, index = this._nodes.length;
            /*if (node.translation) {
                node.translation = [node.translation[0], node.translation[1], node.translation[2]];
            }*/
            node.extras = {
                "TRN_node": {
                    "translation": translation,
                    "quaternion": rotation,
                    "scale": scale,
                }
            };
            this._nodes.push(node);
            if (addToRootNodes)
                this._inodes.push(index);
            return { node: node, index: index };
        };
        GLTFConverter.prototype.getNodeByName = function (name) {
            for (var n = 0; n < this._nodes.length; ++n) {
                if (this._nodes[n].name == name)
                    return this._nodes[n];
            }
            return null;
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
        GLTFConverter.prototype.addSkin = function (obj) {
            return this._skins.push(obj), this._skins.length - 1;
        };
        GLTFConverter.prototype.addAnimation = function (obj) {
            return this._animations.push(obj), this._animations.length - 1;
        };
        GLTFConverter.prototype.outputTextures = function () {
            this._gltf.samplers = [
                {
                    "magFilter": samplerMagFilter.LINEAR,
                    "minFilter": samplerMinFilter.LINEAR,
                    "wrapS": samplerWrap.CLAMP_TO_EDGE,
                    "wrapT": samplerWrap.CLAMP_TO_EDGE,
                },
            ];
            if (this.sceneJSON.rversion == 'TR4') {
                this._gltf.samplers.push({
                    "magFilter": samplerMagFilter.LINEAR,
                    "minFilter": samplerMinFilter.LINEAR_MIPMAP_LINEAR,
                    "wrapS": samplerWrap.REPEAT,
                    "wrapT": samplerWrap.REPEAT,
                });
            }
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
                        "zfar": cam.far,
                        "znear": cam.near,
                    }
                }
            ];
        };
        GLTFConverter.prototype.outputMaterials = function () {
            var materials = this._gltf.scenes[0].extras.TRN_materials;
            for (var matName in materials) {
                var material = materials[matName], matparams = material.parameters, uniforms = matparams.uniforms;
                var addUniforms = "";
                if (matparams.skinning) {
                    addUniforms =
                        "attribute vec4 skinIndex;\n" +
                            "attribute vec4 skinWeight;\n";
                    ;
                }
                matparams.vertexShader =
                    "precision highp float;\n" +
                        "uniform mat4 modelMatrix;\n" +
                        "uniform mat4 modelViewMatrix;\n" +
                        "uniform mat4 projectionMatrix;\n" +
                        "uniform mat4 viewMatrix;\n" +
                        "uniform mat3 normalMatrix;\n" +
                        /*"uniform vec3 cameraPosition;\n" +*/
                        "attribute vec3 position;\n" +
                        "attribute vec3 normal;\n" +
                        "attribute vec2 uv;\n" +
                        /*"attribute vec2 uv2;\n" +*/
                        "attribute vec3 color;\n" +
                        addUniforms +
                        "\n" + matparams.vertexShader;
                matparams.fragmentShader =
                    "precision highp float;\n" +
                        "uniform mat4 viewMatrix;\n" +
                        /*"uniform vec3 cameraPosition;\n" +*/
                        "\n" + matparams.fragmentShader;
                for (var n in uniforms) {
                    delete uniforms[n].type;
                }
            }
        };
        GLTFConverter.prototype.outputObjects = function () {
            var rootNode = this.addNode("rootNode", true);
            for (var name_2 in this.__objects) {
                var obj = this.__objects[name_2];
                var geom = this.__geometries[obj.geometry];
                if (!obj.visible /*|| name != "room0" && !name.startsWith("moveable0_0")*/) {
                    //console.log('Object/Mesh ' + name + ' not visible');
                    continue;
                }
                if (geom !== undefined && "id" in geom) {
                    var meshNode = this.createMesh(name_2);
                    if (meshNode != null) {
                        this.addChildToNode(rootNode.node, meshNode.index);
                    }
                }
            }
        };
        GLTFConverter.prototype.createGeometry = function (geometryId) {
            var embedId = this.__geometries[geometryId].id;
            var oembed = this.__embeds[embedId];
            var vertices = oembed.vertices, uvs = oembed.uvs[0], colors = oembed.colors, flags = oembed.attributes._flags.value;
            var skinIndices = oembed.skinIndices, skinWeights = oembed.skinWeights, normals = oembed.normals;
            var hasSkin = skinIndices != null && skinWeights != null;
            var faces = oembed.faces, numFaces3 = 0, numFaces4 = 0;
            if (faces.length == 0) {
                console.log("GLTF Converter: No faces in embed " + embedId + ": geometry not created/mesh not exported.", oembed);
                return null;
            }
            // count number of tri / quad
            var f = 0, lstMatNumbers = [];
            while (f < faces.length) {
                var isTri = (faces[f] & 1) == 0, faceSize = isTri ? 14 : 18;
                var faceMat = faces[f + (isTri ? 4 : 5)];
                if (!isTri) {
                    numFaces4++;
                }
                else {
                    numFaces3++;
                }
                lstMatNumbers[faceMat] = 0;
                f += faceSize;
            }
            // allocate the data buffer
            var numVertices = numFaces3 * 3 + numFaces4 * 4, numTriangles = numFaces3 + numFaces4 * 2;
            var verticesSize = numVertices * 3 * 4, textcoordsSize = numVertices * 2 * 4, colorsSize = numVertices * 3 * 4, flagsSize = numVertices * 4 * 4;
            var skinIndicesSize = hasSkin ? numVertices * 1 * 4 : 0, skinWeightsSize = hasSkin ? numVertices * 4 * 4 : 0, normalsSize = numVertices * 3 * 4;
            var indicesSize = numTriangles * 3 * 2;
            var bufferData = new ArrayBuffer(verticesSize + textcoordsSize + colorsSize + flagsSize + normalsSize + skinIndicesSize + skinWeightsSize + indicesSize);
            // Get the skeleton to offset the vertex data (for skinned mesh)
            var posStack = [];
            if (hasSkin) {
                var bones = oembed.bones;
                var numJoints = bones.length;
                for (var j = 0; j < numJoints; ++j) {
                    var bone = bones[j], pos = bone.pos_init.slice(0);
                    if (bone.parent >= 0) {
                        var p = bone.parent;
                        if (p != -1) {
                            pos[0] += posStack[p][0];
                            pos[1] += posStack[p][1];
                            pos[2] += posStack[p][2];
                        }
                    }
                    posStack.push(pos);
                }
            }
            // fill the buffer with the attributes
            var attributesView = new Float32Array(bufferData, 0, numVertices * (3 + 2 + 3 + 4 + 3 + (hasSkin ? 1 + 4 : 0)));
            var attributesSkinIndicesView = new Uint8Array(bufferData, 0, 4 * numVertices * (3 + 2 + 3 + 4 + 3 + (hasSkin ? 1 + 4 : 0)));
            var min = [1e20, 1e20, 1e20], max = [-1e20, -1e20, -1e20];
            var ofst = 0;
            f = 0;
            while (f < faces.length) {
                var isTri = (faces[f] & 1) == 0, numVert = isTri ? 3 : 4, faceSize = isTri ? 14 : 18;
                for (var v = 0; v < numVert; ++v) {
                    var _a = [vertices[faces[f + v + 1] * 3 + 0], vertices[faces[f + v + 1] * 3 + 1], vertices[faces[f + v + 1] * 3 + 2]], x = _a[0], y = _a[1], z = _a[2];
                    if (hasSkin) {
                        var boneIdx = skinIndices[faces[f + v + 1] * 2 + 0];
                        x += posStack[boneIdx][0];
                        y += posStack[boneIdx][1];
                        z += posStack[boneIdx][2];
                    }
                    min[0] = Math.min(min[0], x);
                    min[1] = Math.min(min[1], y);
                    min[2] = Math.min(min[2], z);
                    max[0] = Math.max(max[0], x);
                    max[1] = Math.max(max[1], y);
                    max[2] = Math.max(max[2], z);
                    // coordinates
                    attributesView.set([x, y, z], ofst);
                    // uvs
                    attributesView.set([uvs[faces[f + v + numVert + 2] * 2 + 0], uvs[faces[f + v + numVert + 2] * 2 + 1]], ofst + 3);
                    // vertex color
                    var color = colors[faces[f + v + 1]], cr = (color & 0xFF0000) >> 16, cg = (color & 0xFF00) >> 8, cb = (color & 0xFF);
                    attributesView.set([cr / 255.0, cg / 255.0, cb / 255.0], ofst + 5);
                    // flags
                    attributesView.set(flags[faces[f + v + 1]], ofst + 8);
                    // normals
                    attributesView.set([normals[faces[f + v + 1] * 3 + 0], normals[faces[f + v + 1] * 3 + 1], normals[faces[f + v + 1] * 3 + 2]], ofst + 12);
                    // skin data
                    if (hasSkin) {
                        attributesSkinIndicesView.set([skinIndices[faces[f + v + 1] * 2 + 0], skinIndices[faces[f + v + 1] * 2 + 1], 0, 0], (ofst + 15) * 4);
                        attributesView.set([skinWeights[faces[f + v + 1] * 2 + 0], skinWeights[faces[f + v + 1] * 2 + 1], 0, 0], ofst + 16);
                        ofst += 5;
                    }
                    ofst += 15;
                }
                f += faceSize;
            }
            // fill the buffer with the indices
            var indicesView = new Uint16Array(bufferData, verticesSize + textcoordsSize + colorsSize + flagsSize + normalsSize + skinIndicesSize + skinWeightsSize, numTriangles * 3);
            var accessorOffsets = [], accessorCounts = [];
            for (var mat = 0, ofst_1 = 0; mat < lstMatNumbers.length; ++mat) {
                accessorOffsets.push(ofst_1 * 2);
                var fIndex = 0;
                f = 0;
                while (f < faces.length) {
                    var isTri = (faces[f] & 1) == 0, faceSize = isTri ? 14 : 18;
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
            var bufferDataIndex = this.addBuffer(bufferData, undefined, embedId + " embed data");
            var bufferViewAttributesIndex = this.addBufferView({
                "name": embedId + "_vertices_attributes",
                "buffer": bufferDataIndex,
                "byteLength": numVertices * (3 + 2 + 3 + 4 + 3 + (hasSkin ? 1 + 4 : 0)) * 4,
                "byteOffset": 0,
                "byteStride": (3 + 2 + 3 + 4 + 3 + (hasSkin ? 1 + 4 : 0)) * 4,
                "target": bufferViewTarget.ARRAY_BUFFER,
            });
            var bufferViewIndicesIndex = this.addBufferView({
                "name": embedId + "_indices",
                "buffer": bufferDataIndex,
                "byteLength": numTriangles * 3 * 2,
                "byteOffset": verticesSize + textcoordsSize + colorsSize + flagsSize + normalsSize + skinIndicesSize + skinWeightsSize,
                "target": bufferViewTarget.ELEMENT_ARRAY_BUFFER,
            });
            var accessorPositionIndex = this.addAccessor({
                "name": embedId + "_position",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": 0,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC3,
                "min": min,
                "max": max,
            });
            var accessorTexcoordIndex = this.addAccessor({
                "name": embedId + "_textcoord",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": 3 * 4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC2,
            });
            var accessorColorIndex = this.addAccessor({
                "name": embedId + "_vertexcolor",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3 + 2) * 4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC3,
            });
            var accessorFlagIndex = this.addAccessor({
                "name": embedId + "_flag",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3 + 2 + 3) * 4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC4,
            });
            var accessorNormalIndex = this.addAccessor({
                "name": embedId + "_normal",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3 + 2 + 3 + 4) * 4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC3,
            });
            var accessorSkinIndexIndex = !hasSkin ? -1 : this.addAccessor({
                "name": embedId + "_skinindex",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3 + 2 + 3 + 4 + 3) * 4,
                "componentType": accessorElementSize.UNSIGNED_BYTE,
                "count": numVertices,
                "type": accessorType.VEC4,
            });
            var accessorSkinWeightIndex = !hasSkin ? -1 : this.addAccessor({
                "name": embedId + "_skinweight",
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3 + 2 + 3 + 4 + 3 + 1) * 4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC4,
            });
            var accessorIndicesIndex = [];
            for (var i = 0; i < accessorOffsets.length; ++i) {
                accessorIndicesIndex.push(this.addAccessor({
                    "name": embedId + "_material" + i + "_indices",
                    "bufferView": bufferViewIndicesIndex,
                    "byteOffset": accessorOffsets[i],
                    "componentType": accessorElementSize.UNSIGNED_SHORT,
                    "count": accessorCounts[i],
                    "type": accessorType.SCALAR,
                }));
            }
            ;
            return {
                bufferViewAttributesIndex: bufferViewAttributesIndex,
                accessorPositionIndex: accessorPositionIndex,
                accessorTexcoordIndex: accessorTexcoordIndex,
                accessorColorIndex: accessorColorIndex,
                accessorFlagIndex: accessorFlagIndex,
                accessorNormalIndex: accessorNormalIndex,
                accessorSkinIndexIndex: accessorSkinIndexIndex,
                accessorSkinWeightIndex: accessorSkinWeightIndex,
                accessorIndicesIndex: accessorIndicesIndex,
            };
        };
        GLTFConverter.prototype.createSkin = function (objName, geometryId, translation, quaternion) {
            var embedId = this.__geometries[geometryId].id;
            var oembed = this.__embeds[embedId];
            var hasSkin = oembed.skinIndices != undefined && oembed.skinWeights != undefined;
            if (!hasSkin) {
                return null;
            }
            var bones = oembed.bones;
            var numJoints = bones.length;
            var bufferDataSkinMatrices = new ArrayBuffer(numJoints * 4 * 4 * 4); // 4*4 mat, each component being a float (4 bytes)
            var skinMatricesView = new Float32Array(bufferDataSkinMatrices, 0, numJoints * 4 * 4);
            var firstJointNodeIndex = this._nodes.length;
            var joints = Array.from({ length: numJoints }, function (v, k) { return firstJointNodeIndex + k; });
            var posStack = [];
            for (var j = 0; j < numJoints; ++j) {
                var bone = bones[j], pos = bone.pos_init.slice(0), rotq = bone.rotq;
                /*if (j == 0) {
                    pos = translation;
                    rotq = quaternion;
                }*/
                var node = this.addNode("bone #" + j + " for " + objName, false, rotq, pos);
                if (bone.parent >= 0) {
                    var parentNode = this._nodes[bone.parent + firstJointNodeIndex];
                    if (parentNode.children === undefined) {
                        parentNode.children = [];
                    }
                    parentNode.children.push(node.index);
                    var p = bone.parent;
                    if (p != -1) {
                        pos[0] += posStack[p][0];
                        pos[1] += posStack[p][1];
                        pos[2] += posStack[p][2];
                    }
                }
                //skinMatricesView.set([1,0,0,0, 0,1,0,0, 0,0,1,0, (bone.pos_init! as Array<number>)[0],(bone.pos_init! as Array<number>)[1],(bone.pos_init! as Array<number>)[2],1], j*4*4);
                /*if ( j== 0) {
                    skinMatricesView.set([1,0,0,0, 0,1,0,0, 0,0,1,0, translation[0],translation[1],translation[2],1], j*4*4);
                } else*/ {
                    skinMatricesView.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -pos[0], -pos[1], -pos[2], 1], j * 4 * 4);
                }
                //let posp = <number>bone.parent >= 0 ? bones[<number>bone.parent].pos_init as [] : [0,0,0];
                //skinMatricesView.set([1,0,0,0, 0,1,0,0, 0,0,1,0, -posp[0],-posp[1],-posp[2],1], j*4*4);
                //skinMatricesView.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], j*4*4);
                posStack.push(pos);
            }
            var bufferDataSkinMatricesIndex = this.addBuffer(bufferDataSkinMatrices, undefined, objName + " skin data");
            var bufferViewSkinMatricesIndex = this.addBufferView({
                "name": objName + "_skin_matrices",
                "buffer": bufferDataSkinMatricesIndex,
                "byteLength": numJoints * 4 * 4 * 4,
                "byteOffset": 0,
            });
            var accessorSkinMatricesIndex = this.addAccessor({
                "name": objName + "_skin_matrices",
                "bufferView": bufferViewSkinMatricesIndex,
                "byteOffset": 0,
                "componentType": accessorElementSize.FLOAT,
                "count": numJoints,
                "type": accessorType.MAT4,
            });
            var skinIndex = this.addSkin({
                "name": objName + " skin",
                "inverseBindMatrices": accessorSkinMatricesIndex,
                "joints": joints,
            });
            return { skinIndex: skinIndex, firstJointNodeIndex: firstJointNodeIndex };
        };
        GLTFConverter.prototype.createMesh = function (objName, addAsRootNode) {
            if (addAsRootNode === void 0) { addAsRootNode = false; }
            var obj = this.__objects[objName];
            var materials = obj.material;
            var mesh = {
                "name": objName + " mesh",
                "primitives": [],
                "extras": {
                    "TRN_behaviours": [],
                },
            };
            if (obj.isSprite) {
                mesh.extras.TRN_behaviours.push({
                    "type": "sprite",
                });
            }
            var geomData = this._mapNameToGeometry[obj.geometry];
            if (geomData == null) {
                geomData = this.createGeometry(obj.geometry);
                if (geomData == null) {
                    return null;
                }
                this._mapNameToGeometry[obj.geometry] = geomData;
            }
            if (geomData.accessorIndicesIndex.length != materials.length) {
                console.log("GLTF Converter: Mesh " + objName + " has " + materials.length + " materials whereas its geometry has " + geomData.accessorIndicesIndex.length + "! objects not exported.", obj, geomData);
                return null;
            }
            var _loop_1 = function (mat) {
                var material = materials[mat], map = material.uniforms.map;
                var numTexture = map ? parseInt(map.value) : -1;
                var userData = material.userData;
                var accessorIndicesIndex = geomData.accessorIndicesIndex[mat];
                var gmaterial = {
                    "name": objName + " material " + mat,
                    "pbrMetallicRoughness": {
                        "baseColorFactor": [1, 1, 1, 1],
                    },
                    "extensions": {
                        "KHR_materials_unlit": {},
                    },
                    "extras": {
                        "TRN_materials": {
                            "name": material.material,
                            "uniforms": jQuery.extend(true, {}, material.uniforms)
                        },
                        "TRN_behaviours": []
                    }
                };
                if (userData.animatedTexture) {
                    var animTexture = this_1.__animatedTextures[userData.animatedTexture.idxAnimatedTexture];
                    if (!animTexture.scrolltexture || !this_1.sceneJSON.useUVRotate) {
                        var animCoords_1 = [];
                        animTexture.animcoords.forEach(function (ac) {
                            animCoords_1.push({
                                "minU": ac.minU,
                                "minV": ac.minV,
                                "texture": parseInt(ac.texture.substring(7)),
                            });
                        });
                        gmaterial.extras.TRN_behaviours.push({
                            "type": "animatedTexture",
                            "pos": userData.animatedTexture.pos,
                            "minU": userData.animatedTexture.minU,
                            "minV": userData.animatedTexture.minV,
                            "speed": animTexture.animspeed,
                            "animCoords": animCoords_1,
                        });
                    }
                    else {
                        var coords = animTexture.animcoords[0];
                        var vOffset = coords.minV - userData.animatedTexture.minV * 0.5;
                        gmaterial.extras.TRN_behaviours.push({
                            "type": "uvRotate",
                            "tileHeight": TRN.Consts.uvRotateTileHeight,
                            "vOffset": vOffset,
                        });
                        gmaterial.extras.TRN_materials.uniforms.offsetRepeat = {
                            "value": [coords.minU - userData.animatedTexture.minU, vOffset, 1, 0.5],
                        };
                    }
                }
                else if (obj.hasScrollAnim) {
                    gmaterial.extras.TRN_behaviours.push({
                        "type": "scrollTexture",
                        "tileHeight": TRN.Consts.moveableScrollAnimTileHeight,
                    });
                }
                var uniforms = gmaterial.extras.TRN_materials.uniforms;
                for (var n in uniforms) {
                    delete uniforms[n].type;
                }
                if (numTexture >= 0) {
                    gmaterial.pbrMetallicRoughness.baseColorTexture = { "index": numTexture };
                }
                else {
                    this_1._glc++;
                    console.log('GLTF Converter: No texture for mesh', objName, mat, material, obj);
                }
                if (material.hasAlpha) {
                    gmaterial.alphaMode = "BLEND";
                }
                else {
                    gmaterial.alphaMode = "MASK";
                    gmaterial.alphaCutoff = 0.5;
                }
                var primitive = {
                    "attributes": {
                        "POSITION": geomData.accessorPositionIndex,
                        "TEXCOORD_0": geomData.accessorTexcoordIndex,
                        "COLOR_0": geomData.accessorColorIndex,
                        /*"NORMAL": geomData.accessorNormalIndex,*/
                        "_flags": geomData.accessorFlagIndex,
                    },
                    "indices": accessorIndicesIndex,
                    "mode": primitiveMode.TRIANGLES,
                    "material": this_1.addMaterial(gmaterial),
                };
                if (objName != "skydome")
                    primitive.attributes["NORMAL"] = geomData.accessorNormalIndex;
                if (geomData.accessorSkinIndexIndex >= 0) {
                    primitive.attributes["JOINTS_0"] = geomData.accessorSkinIndexIndex;
                    primitive.attributes["WEIGHTS_0"] = geomData.accessorSkinWeightIndex;
                }
                mesh.primitives.push(primitive);
            };
            var this_1 = this;
            for (var mat = 0; mat < materials.length; ++mat) {
                _loop_1(mat);
            }
            var skin = this.createSkin(objName, obj.geometry, obj.position, obj.quaternion);
            var meshNode = this.addNode(objName, addAsRootNode, /*skin != null ? [0,0,0,1] :*/ obj.quaternion, /*skin != null ? [0,0,0] :*/ obj.position, /*skin != null ? [1,1,1] :*/ obj.scale);
            meshNode.node.mesh = this.addMesh(mesh);
            if (skin != null) {
                meshNode.node.skin = skin.skinIndex;
                this._mapNameToSkin[objName] = skin.skinIndex;
                meshNode.node.children = [skin.firstJointNodeIndex];
            }
            return meshNode;
        };
        GLTFConverter.prototype.outputAnimations = function () {
            var fps = 30;
            var _loop_2 = function (name_3) {
                var obj = this_2.__objects[name_3];
                var hasAnim = obj.has_anims !== undefined ? obj.has_anims : false;
                var animStartIndex = obj.animationStartIndex !== undefined ? obj.animationStartIndex : -1;
                var numAnimations = obj.numAnimations !== undefined ? obj.numAnimations : -1;
                //console.log(name, hasAnim, animStartIndex, numAnimations, obj);
                if (!hasAnim || !obj.visible || animStartIndex < 0 || numAnimations <= 0)
                    return "continue";
                //if (name != "moveable0_0") continue;
                // Get the bone positions of the mesh in posStack
                var posStack = [];
                var embedId = this_2.__geometries[obj.geometry].id;
                var oembed = this_2.__embeds[embedId];
                var bones = oembed.bones;
                bones.forEach(function (b) { return posStack.push(b.pos_init); });
                var numData = bones.length;
                // 
                var animIndex = 0;
                var track = this_2.__animTracks[animStartIndex + animIndex];
                // Calculate the size and create the data buffer
                var bufferTimeSize = 0, bufferDataTransSize = 0, bufferDataQuatSize = 0;
                var keys = track.keys, bad = false;
                for (var k = 0; k < keys.length; ++k) {
                    var key = keys[k];
                    var dataKey = key.data;
                    var numDataKey = dataKey.length;
                    bufferTimeSize += 1;
                    bufferDataTransSize += numData * 3;
                    bufferDataQuatSize += numData * 4;
                    if (numData > numDataKey) {
                        bad = true;
                    }
                }
                if (bad) {
                    console.log('No animation for object ' + name_3 + ' because mismatched number of data in keys! numData=' + numData, obj, track);
                    return "continue";
                }
                var buffer = new ArrayBuffer(bufferTimeSize * 4 + (bufferDataTransSize + bufferDataQuatSize) * 4);
                // Fill the buffer
                var timeView = new Float32Array(buffer, 0, bufferTimeSize);
                var dataView = new Float32Array(buffer, bufferTimeSize * 4, bufferDataTransSize + bufferDataQuatSize);
                var timeMin = 1e10, timeMax = -1e10;
                for (var k = 0; k < keys.length; ++k) {
                    var key = keys[k];
                    var data = key.data;
                    var time = key.time / fps;
                    timeMin = Math.min(timeMin, time);
                    timeMax = Math.max(timeMax, time);
                    timeView.set([time], k);
                    for (var d = 0; d < numData; ++d) {
                        var trans = data[d].position;
                        var quat = data[d].quaternion;
                        var x = trans.x + (posStack.length > d ? posStack[d][0] : 0);
                        var y = trans.y + (posStack.length > d ? posStack[d][1] : 0);
                        var z = trans.z + (posStack.length > d ? posStack[d][2] : 0);
                        dataView.set([x, y, z], d * keys.length * 3 + k * 3);
                        dataView.set([quat.x, quat.y, quat.z, quat.w], d * keys.length * 4 + k * 4 + numData * keys.length * 3);
                        //dataView.set([0,0,0], d*keys.length*3+k*3)
                        //dataView.set([0,0,0,1], d*keys.length*4+k*4+data.length*keys.length*3)
                    }
                }
                var bufferIndex = this_2.addBuffer(buffer, undefined, name_3 + " anim #" + animIndex);
                var bufferViewTimeIndex = this_2.addBufferView({
                    "name": name_3 + " anim #" + animIndex + " time",
                    "buffer": bufferIndex,
                    "byteLength": bufferTimeSize * 4,
                    "byteOffset": 0,
                });
                var accessorTimeIndex = this_2.addAccessor({
                    "name": name_3 + " anim #" + animIndex + " time",
                    "bufferView": bufferViewTimeIndex,
                    "byteOffset": 0,
                    "componentType": accessorElementSize.FLOAT,
                    "count": keys.length,
                    "type": accessorType.SCALAR,
                    "min": [timeMin],
                    "max": [timeMax],
                });
                var translationViewIndex = this_2.addBufferView({
                    "name": name_3 + " anim #" + animIndex + " data view",
                    "buffer": bufferIndex,
                    "byteLength": bufferDataTransSize * 4,
                    "byteOffset": bufferTimeSize * 4,
                });
                var quaternionViewIndex = this_2.addBufferView({
                    "name": name_3 + " anim #" + animIndex + " rotations",
                    "buffer": bufferIndex,
                    "byteLength": bufferDataQuatSize * 4,
                    "byteOffset": bufferTimeSize * 4 + bufferDataTransSize * 4,
                });
                var animation = {
                    "name": "Animation #" + animIndex + " for object " + name_3,
                    "channels": [],
                    "samplers": []
                };
                var firstNodeSkin = this_2._skins[this_2._mapNameToSkin[name_3]].joints[0];
                var samplerIndex = 0;
                for (var d = 0; d < numData; ++d) {
                    animation.channels.push({
                        "sampler": samplerIndex++,
                        "target": {
                            "node": firstNodeSkin + d,
                            "path": channelTargetPath.translation,
                        }
                    });
                    animation.channels.push({
                        "sampler": samplerIndex++,
                        "target": {
                            "node": firstNodeSkin + d,
                            "path": channelTargetPath.rotation,
                        }
                    });
                    var accessorTranslationIndex = this_2.addAccessor({
                        "name": name_3 + " anim #" + animIndex + " node #" + d + " translation",
                        "bufferView": translationViewIndex,
                        "byteOffset": 3 * keys.length * 4 * d,
                        "componentType": accessorElementSize.FLOAT,
                        "count": keys.length,
                        "type": accessorType.VEC3,
                    });
                    var accessorQuaternionIndex = this_2.addAccessor({
                        "name": name_3 + " anim #" + animIndex + " node #" + d + " quaternion",
                        "bufferView": quaternionViewIndex,
                        "byteOffset": 4 * keys.length * 4 * d,
                        "componentType": accessorElementSize.FLOAT,
                        "count": keys.length,
                        "type": accessorType.VEC4,
                    });
                    animation.samplers.push({
                        "input": accessorTimeIndex,
                        "interpolation": samplerInterpolation.LINEAR,
                        "output": accessorTranslationIndex,
                    });
                    animation.samplers.push({
                        "input": accessorTimeIndex,
                        "interpolation": samplerInterpolation.LINEAR,
                        "output": accessorQuaternionIndex,
                    });
                }
                this_2.addAnimation(animation);
            };
            var this_2 = this;
            for (var name_3 in this.__objects) {
                _loop_2(name_3);
            }
        }; // function outputAnimations
        return GLTFConverter;
    }()); // class GLTFConverter
    TRNUtil.GLTFConverter = GLTFConverter;
})(TRNUtil || (TRNUtil = {})); // TRN namespace
//# sourceMappingURL=GLTFConverter.js.map