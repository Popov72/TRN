declare var glMatrix: any;
declare var TRN: any;
declare var jQuery: any;

namespace TRNUtil {

    type vec3 = number[];
    type vec4 = number[];

    enum bufferViewTarget {
        ARRAY_BUFFER            = 34962, /* for vertex attributes */
        ELEMENT_ARRAY_BUFFER    = 34963, /* for vertex array indices */
    };
    
    enum accessorElementSize {
        BYTE            = 5120,
        UNSIGNED_BYTE   = 5121,
        SHORT           = 5122,
        UNSIGNED_SHORT  = 5123,
        UNSIGNED_INT    = 5125,
        FLOAT           = 5126,
    };

    enum accessorType {
		SCALAR  = "SCALAR",
		VEC2    = "VEC2",
		VEC3    = "VEC3",
		VEC4    = "VEC4",
		MAT2    = "MAT2",
		MAT3    = "MAT3",
		MAT4    = "MAT4",
    };

    enum primitiveMode {
        POINTS = 0,
        LINES,
        LINE_LOOP,
        LINE_STRIP,
        TRIANGLES,
        TRIANGLE_STRIP,
        TRIANGLE_FAN,
    }

    enum samplerMagFilter {
        NEAREST = 9728,
        LINEAR  = 9729,
    }

    enum samplerMinFilter {
        NEAREST                 = 9728,
        LINEAR                  = 9729,
        NEAREST_MIPMAP_NEAREST  = 9984,
        LINEAR_MIPMAP_NEAREST   = 9985,
        NEAREST_MIPMAP_LINEAR   = 9986,
        LINEAR_MIPMAP_LINEAR    = 9987,
    }

    enum samplerWrap {
        CLAMP_TO_EDGE   = 33071,
        MIRRORED_REPEAT = 33648,
        REPEAT          = 10497,
    }

    interface Node {
        "name": string,
        "rotation"?: vec4,
        "scale"?: vec4,
        "translation"?: vec3,
        "children"?: number[],
        "skin"?: number,
        [name:string]: any,
    }

    interface NodeIndex {
        "node": Node,
        "index": number, 
    }
    
    interface Buffer {
        "name"?: string,
        "byteLength": number,
        "uri": string,
    }

    interface BufferView {
        "name"?: string,
        "buffer": number,
        "byteLength": number,
        "byteOffset": number,
        "byteStride"?: number,
        "target"?: bufferViewTarget,
    }

    interface Accessor {
        "name"?: string,
        "bufferView": number,
        "byteOffset": number,
        "componentType": accessorElementSize,
        "count": number,
        "min"?: number[],
        "max"?: number[],
        "type": accessorType,
    }

    interface Primitive {
        "attributes": {
            "POSITION": number,
            "NORMAL"?: number,
            "TANGENT"?: number,
            "TEXCOORD_0"?: number,
            "TEXCOORD_1"?: number,
            "COLOR_0"?: number,
            "JOINTS_0"?: number,
            "WEIGHTS_0"?: number,
            [name:string]: number | undefined,
        },
        "indices": number,
        "material"?: number,
        "mode"?: primitiveMode,
    }

    interface Mesh {
        "name"?: string,
        "primitives": Primitive[],
        "extras"?: any,
    }

    interface Texture {
        "name"?: string,
        "source": number,
        "sampler": number,
    }

    interface Image {
        "name"?: string,
        "bufferView": number,
        "mimeType": string,
    }

    interface Skin {
        "name"?: string,
        "inverseBindMatrices": number,
        "joints": Array<number>,
    }

    enum channelTargetPath {
        translation = "translation",
        rotation    = "rotation",
        scale       = "scale",
        weights     = "weights",
    }

    interface Channel {
        "sampler": number,
        "target": {
            "node": number,
            "path": channelTargetPath,
        }
    }

    enum samplerInterpolation {
        LINEAR      = "LINEAR",
        STEP        = "STEP",
        CUBICSPLINE = "CUBICSPLINE",
    }

    interface Sampler {
        "input": number,
        "interpolation": samplerInterpolation,
        "output": number,
    }

    interface Animation {
        "name"?: string,
        "channels": Array<Channel>,
        "samplers": Array<Sampler>,
    }

    interface _GeometryData {
        "bufferViewAttributesIndex": number,
        "accessorPositionIndex": number,
        "accessorTexcoordIndex": number,
        "accessorColorIndex": number,
        "accessorFlagIndex": number,
        "accessorNormalIndex": number,
        "accessorSkinIndexIndex": number,
        "accessorSkinWeightIndex": number,
        "accessorIndicesIndex": Array<number>,
    }

    interface _MapGeometryData {
        [name: string]: _GeometryData,
    }

    interface _MapSkin {
        [name: string]: number,
    }

    type AnyJson =  boolean | number | string | null | JsonArray | JsonMap | Buffer | BufferView | Accessor | Mesh | Texture | Image | Skin | Animation;
    interface JsonMap {  [key: string]: AnyJson; }
    interface JsonArray extends Array<AnyJson> {}

    export class GLTFConverter {

        private _gltf:              JsonMap;
        private _nodes:             Node[];
        private _inodes:            number[];
        private _meshes:            Mesh[];
        private _buffers:           Buffer[];
        private _bufferViews:       BufferView[];
        private _accessors:         Accessor[];
        private _materials:         JsonMap[];
        private _skins:             Skin[];
        private _animations:        Animation[];

        private __objects:          JsonMap;
        private __embeds:           JsonMap;
        private __geometries:       JsonMap;
        private __animatedTextures: JsonMap;
        private __animTracks:       JsonMap;

        private _cameraNode:        Node | null;
        private _glc:               number;
        private _mapNameToGeometry: _MapGeometryData;
        private _mapNameToSkin:     _MapSkin;

        constructor(public trLevel:JsonMap, public sceneJSON:JsonMap) {
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

            this.__objects = this.sceneJSON.objects! as JsonMap;
            this.__embeds = this.sceneJSON.embeds! as JsonMap;
            this.__geometries = this.sceneJSON.geometries! as JsonMap;
            this.__animatedTextures = this.sceneJSON.animatedTextures! as JsonMap;
            this.__animTracks = this.sceneJSON.animTracks! as JsonMap;

            this._cameraNode = null;
            this._glc = 0;
            this._mapNameToGeometry = {};
            this._mapNameToSkin = {};
        }

        get data() { 
            return this._gltf; 
        }

        convert(): void {
            glMatrix.glMatrix.setMatrixArrayType(Array);

            this.outputTextures();
            this.outputCamera();
            this.outputObjects();
            this.outputMaterials();
            this.outputAnimations();

            console.log(`GLTF Converter: Number of meshes without textures=${this._glc}`);
        }

        private addNode(name: string, addToRootNodes: boolean = false, rotation?: vec4, translation?: vec3, scale?: vec3): NodeIndex {
            let node: Node = {
                name, rotation, scale, translation
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

            if (addToRootNodes) this._inodes.push(index);

            return { node, index };
        }

        private getNodeByName(name: string): Node | null {
            for (let n = 0; n < this._nodes.length; ++n) {
                if (this._nodes[n].name == name) return this._nodes[n];
            }
            return null;
        }

        private addChildToNode(src: Node, child: number): void {
            (src.children = src.children || []).push(child);
        }

        private addBuffer(buf: string | ArrayBuffer, bufByteLen?: number, name?: string): number {
            if (typeof buf !== "string") {
                bufByteLen = buf.byteLength;
                buf = "data:application/octet-stream;base64," + TRN.Base64Binary.encode(buf);
            }
            this._buffers.push({
                "name": name,
                "byteLength": bufByteLen!,
                "uri": buf,
            });

            return this._buffers.length-1;
        }

        private addBufferView(obj: BufferView): number {
            return this._bufferViews.push(obj), this._bufferViews.length-1;

        }

        private addAccessor(obj: Accessor): number {
            return this._accessors.push(obj), this._accessors.length-1;
        }

        private addMesh(obj: Mesh): number {
            return this._meshes.push(obj), this._meshes.length-1;
        }

        private addMaterial(obj: JsonMap): number {
            return this._materials.push(obj), this._materials.length-1;
        }

        private addSkin(obj: Skin): number {
            return this._skins.push(obj), this._skins.length-1;
        }

        private addAnimation(obj: Animation): number {
            return this._animations.push(obj), this._animations.length-1;
        }

        private outputTextures(): void {
            this._gltf.samplers = [
                {
                    "magFilter":    samplerMagFilter.LINEAR,
                    "minFilter":    samplerMinFilter.LINEAR,
                    "wrapS":        samplerWrap.CLAMP_TO_EDGE,
                    "wrapT":        samplerWrap.CLAMP_TO_EDGE,
                },
            ];

            if (this.sceneJSON.rversion == 'TR4') {
                this._gltf.samplers.push(
                    {
                        "magFilter":    samplerMagFilter.LINEAR,
                        "minFilter":    samplerMinFilter.LINEAR_MIPMAP_LINEAR,
                        "wrapS":        samplerWrap.REPEAT,
                        "wrapT":        samplerWrap.REPEAT,
                    }            
                );
            }

            let textures:JsonMap = this.sceneJSON.textures as JsonMap;
            let otextures: Texture[] = [], oimages: Image[] = [];

            for(let name in textures) {
                let data = (textures[name]! as JsonMap).url as string;
                let dataLen = 3*Math.ceil((data.length - data.indexOf(',') - 1)/4);

                if (data.charAt(data.length-1) == '=' && data.charAt(data.length-2) == '=') dataLen -= 2;
                else if (data.charAt(data.length-1) == '=') dataLen--;

                data = data.replace("image/png", "application/octet-stream");

                otextures.push({
                    "sampler": (this.sceneJSON.rversion == 'TR4' && name == 'texture' + (TRN.Helper.objSize(textures) - 1)) ? 1 : 0,
                    "source": oimages.length,
                });
                oimages.push({
                    "bufferView": this.addBufferView({
                        "name": `texture ${name}`,
                        "buffer": this.addBuffer(data, dataLen, `texture ${name} data`),
                        "byteLength": dataLen,
                        "byteOffset": 0,
                    }),
                    "mimeType": "image/png",
                });
            }

            this._gltf.images = oimages;
            this._gltf.textures = otextures;
        }

        private outputCamera(): void {
            let cam = this.__objects.camera1 as JsonMap;
            
            this._cameraNode = this.addNode("Camera", true, cam.quaternion as vec4, cam.position as vec3).node;
            
            this._cameraNode.camera = 0;

            this._gltf.cameras = [
                {
                    "type": "perspective",
                    "perspective" : {
                        "aspectRatio": 1.0,
                        "yfov": (cam.fov as number)*Math.PI/180,
                        "zfar": cam.far as number,
                        "znear": cam.near as number,
                    }
                }
            ];
        }

        private outputMaterials() {
            let materials = (((this._gltf.scenes! as JsonArray)[0] as JsonMap).extras as JsonMap).TRN_materials as JsonMap;
            for (let matName in materials) {
                let material = materials[matName] as JsonMap, matparams = material.parameters as JsonMap, uniforms = matparams.uniforms as JsonMap;

                let addUniforms: string = "";

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

                for (let n in uniforms) {
                    delete (uniforms[n] as JsonMap).type;
                }
            }
        }

        private outputObjects() {
            let rootNode = this.addNode("rootNode", true);

            for (let name in this.__objects) {
                let obj = this.__objects[name] as JsonMap;
                let geom = this.__geometries[obj.geometry as string] as JsonMap;
                if (!obj.visible /*|| name != "room0" && !name.startsWith("moveable0_0")*/) {
                    //console.log('Object/Mesh ' + name + ' not visible');
                    continue;
                }
                if (geom !== undefined && "id" in geom) {
                    let meshNode = this.createMesh(name);
                    if (meshNode != null) {
                        this.addChildToNode(rootNode.node, meshNode.index);
                    }
                }
            }
        }

        private createGeometry(geometryId: string): _GeometryData | null {
            let embedId = (this.__geometries[geometryId] as JsonMap).id as string;
            let oembed = this.__embeds[embedId] as JsonMap;

            let vertices = oembed.vertices as [], uvs = (oembed.uvs as [[]])[0], colors = oembed.colors as [], flags = ((oembed.attributes as JsonMap)._flags as JsonMap).value as [];
            let skinIndices = oembed.skinIndices as [], skinWeights = oembed.skinWeights as [], normals = oembed.normals as [];
            let hasSkin = skinIndices != null && skinWeights != null;
            let faces = oembed.faces as [], numFaces3 = 0, numFaces4 = 0;

            if (faces.length == 0) {
                console.log(`GLTF Converter: No faces in embed ${embedId}: geometry not created/mesh not exported.`, oembed);
                return null;
            }

            // count number of tri / quad
            let f = 0, lstMatNumbers: Array<number> = [];
            while (f < faces.length) {
                let isTri = (faces[f] & 1) == 0, faceSize = isTri ? 14 : 18;
                let faceMat: number = faces[f+(isTri ? 4 : 5)];
                if (!isTri) {
                    numFaces4++;
                } else {
                    numFaces3++;
                }
                lstMatNumbers[faceMat] = 0;
                f += faceSize;
            }

            // allocate the data buffer
            let numVertices = numFaces3*3 + numFaces4*4, numTriangles = numFaces3 + numFaces4*2;
            let verticesSize = numVertices*3*4, textcoordsSize = numVertices*2*4, colorsSize = numVertices*3*4, flagsSize = numVertices*4*4;
            let skinIndicesSize = hasSkin ? numVertices*1*4 : 0, skinWeightsSize = hasSkin ? numVertices*4*4 : 0, normalsSize = numVertices*3*4;
            let indicesSize = numTriangles*3*2;

            let bufferData = new ArrayBuffer(verticesSize + textcoordsSize + colorsSize + flagsSize + normalsSize + skinIndicesSize + skinWeightsSize + indicesSize);

            // Get the skeleton to offset the vertex data (for skinned mesh)
            let posStack: Array<Array<number>> = [];

            if (hasSkin) {
                let bones = oembed.bones as Array<JsonMap>;
                let numJoints = bones.length;

                for (let j = 0; j < numJoints; ++j) {
                    let bone = bones[j], pos = (bone.pos_init as []).slice(0) as Array<number>;
                    if (<number>bone.parent >= 0) {
                        let p = <number>bone.parent;
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
            let attributesView = new Float32Array(bufferData, 0, numVertices*(3+2+3+4+3+(hasSkin ? 1+4 : 0)));
            let attributesSkinIndicesView = new Uint8Array(bufferData, 0, 4*numVertices*(3+2+3+4+3+(hasSkin ? 1+4 : 0)));
            let min = [1e20, 1e20, 1e20], max = [-1e20, -1e20, -1e20 ];
            let ofst = 0;
            f = 0;
            while (f < faces.length) {
                let isTri = (faces[f] & 1) == 0, numVert = isTri ? 3 : 4, faceSize = isTri ? 14 : 18;
                for (let v = 0; v < numVert; ++v) {
                    let [x , y, z] = [vertices[faces[f+v+1]*3 + 0] as number, vertices[faces[f+v+1]*3 + 1] as number, vertices[faces[f+v+1]*3 + 2] as number];
                    
                    if (hasSkin) {
                        let boneIdx = skinIndices[faces[f+v+1]*2+0] as number;
                        x += posStack[boneIdx][0];
                        y += posStack[boneIdx][1];
                        z += posStack[boneIdx][2];
                    }

                    min[0] = Math.min(min[0], x);    min[1] = Math.min(min[1], y);    min[2] = Math.min(min[2], z);
                    max[0] = Math.max(max[0], x);    max[1] = Math.max(max[1], y);    max[2] = Math.max(max[2], z);

                    // coordinates
                    attributesView.set([x, y, z], ofst);

                    // uvs
                    attributesView.set([uvs[faces[f+v+numVert+2]*2+0], uvs[faces[f+v+numVert+2]*2+1]], ofst + 3);

                    // vertex color
                    let color = colors[faces[f+v+1]] as number, cr = (color & 0xFF0000) >> 16, cg = (color & 0xFF00) >> 8, cb = (color & 0xFF);
                    attributesView.set([cr/255.0, cg/255.0, cb/255.0], ofst + 5);

                    // flags
                    attributesView.set(flags[faces[f+v+1]], ofst + 8);

                    // normals
                    attributesView.set([ normals[faces[f+v+1]*3 + 0], normals[faces[f+v+1]*3 + 1], normals[faces[f+v+1]*3 + 2] ], ofst + 12);

                    // skin data
                    if (hasSkin) {
                        attributesSkinIndicesView.set([skinIndices[faces[f+v+1]*2+0], skinIndices[faces[f+v+1]*2+1], 0, 0], (ofst + 15)*4);
                        attributesView.set([skinWeights[faces[f+v+1]*2+0], skinWeights[faces[f+v+1]*2+1], 0, 0], ofst + 16);
                        ofst += 5;
                    }

                    ofst += 15;
                }
                f += faceSize;
            }

            // fill the buffer with the indices
            let indicesView = new Uint16Array(bufferData, verticesSize + textcoordsSize + colorsSize + flagsSize + normalsSize + skinIndicesSize + skinWeightsSize, numTriangles*3);
            let accessorOffsets: number[] = [], accessorCounts: number[] = [];

            for (let mat = 0, ofst = 0; mat < lstMatNumbers.length; ++mat) {
                accessorOffsets.push(ofst*2);
                let fIndex = 0;
                f = 0;
                while  (f < faces.length) {
                    let isTri = (faces[f] & 1) == 0, faceSize = isTri ? 14 : 18;
                    let faceMat: number = faces[f+(isTri ? 4 : 5)];
                    if (faceMat == mat) {
                        if (!isTri) {
                            indicesView.set([fIndex+0, fIndex+1, fIndex+3], ofst);
                            indicesView.set([fIndex+1, fIndex+2, fIndex+3], ofst + 3);
                            ofst += 6;
                        } else {
                            indicesView.set([fIndex+0, fIndex+1, fIndex+2], ofst);
                            ofst += 3;
                            }
                    }
                    fIndex += 3;
                    if (!isTri) fIndex++;
                    f += faceSize;
                }
                accessorCounts.push((ofst*2-accessorOffsets[mat])/2);
            }

            let bufferDataIndex = this.addBuffer(bufferData, undefined, `${embedId} embed data`);

            let bufferViewAttributesIndex = this.addBufferView({
                "name": `${embedId}_vertices_attributes`,
                "buffer": bufferDataIndex,
                "byteLength": numVertices*(3+2+3+4+3+(hasSkin ? 1+4:0))*4,
                "byteOffset": 0,
                "byteStride": (3+2+3+4+3+(hasSkin ? 1+4:0))*4,
                "target": bufferViewTarget.ARRAY_BUFFER,
            });
            let bufferViewIndicesIndex = this.addBufferView({
                "name": `${embedId}_indices`,
                "buffer": bufferDataIndex,
                "byteLength": numTriangles*3*2,
                "byteOffset": verticesSize + textcoordsSize + colorsSize + flagsSize + normalsSize + skinIndicesSize + skinWeightsSize,
                "target": bufferViewTarget.ELEMENT_ARRAY_BUFFER,
            });

            let accessorPositionIndex = this.addAccessor({
                "name": `${embedId}_position`,
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": 0,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC3,
                "min": min,
                "max": max,
            });
            let accessorTexcoordIndex = this.addAccessor({
                "name": `${embedId}_textcoord`,
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": 3*4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC2,
            });
            let accessorColorIndex = this.addAccessor({
                "name": `${embedId}_vertexcolor`,
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3+2)*4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC3,
            });
            let accessorFlagIndex = this.addAccessor({
                "name": `${embedId}_flag`,
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3+2+3)*4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC4,
            });
            let accessorNormalIndex = this.addAccessor({
                "name": `${embedId}_normal`,
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3+2+3+4)*4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC3,
            });
            let accessorSkinIndexIndex = !hasSkin ? -1 : this.addAccessor({
                "name": `${embedId}_skinindex`,
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3+2+3+4+3)*4,
                "componentType": accessorElementSize.UNSIGNED_BYTE,
                "count": numVertices,
                "type": accessorType.VEC4,
            });
            let accessorSkinWeightIndex = !hasSkin ? -1 : this.addAccessor({
                "name": `${embedId}_skinweight`,
                "bufferView": bufferViewAttributesIndex,
                "byteOffset": (3+2+3+4+3+1)*4,
                "componentType": accessorElementSize.FLOAT,
                "count": numVertices,
                "type": accessorType.VEC4,
            });

            let accessorIndicesIndex: Array<number> = [];
            for (let i = 0; i < accessorOffsets.length; ++i) {
                accessorIndicesIndex.push(this.addAccessor({
                    "name": `${embedId}_material${i}_indices`,
                    "bufferView": bufferViewIndicesIndex,
                    "byteOffset": accessorOffsets[i],
                    "componentType": accessorElementSize.UNSIGNED_SHORT,
                    "count": accessorCounts[i],
                    "type": accessorType.SCALAR,
                }));
            };

            return {
                bufferViewAttributesIndex, 
                accessorPositionIndex,
                accessorTexcoordIndex,
                accessorColorIndex,
                accessorFlagIndex,
                accessorNormalIndex,
                accessorSkinIndexIndex,
                accessorSkinWeightIndex,
                accessorIndicesIndex,
            };
        }

        private createSkin(objName: string, geometryId: string, translation: vec3, quaternion: vec4): Object | null {
            let embedId = (this.__geometries[geometryId] as JsonMap).id as string;
            let oembed = this.__embeds[embedId] as JsonMap;

            let hasSkin = oembed.skinIndices != undefined && oembed.skinWeights != undefined;

            if (!hasSkin) {
                return null;
            }

            let bones = oembed.bones as Array<JsonMap>;
            let numJoints = bones.length;

            let bufferDataSkinMatrices = new ArrayBuffer(numJoints*4*4*4); // 4*4 mat, each component being a float (4 bytes)
            let skinMatricesView = new Float32Array(bufferDataSkinMatrices, 0, numJoints*4*4);
            
            let firstJointNodeIndex = this._nodes.length;
            let joints = Array.from({length: numJoints}, (v, k) => firstJointNodeIndex+k); 

            let posStack: Array<Array<number>> = [];
            for (let j = 0; j < numJoints; ++j) {
                let bone = bones[j], pos = (bone.pos_init as []).slice(0) as Array<number>, rotq = bone.rotq as Array<number>;
                /*if (j == 0) {
                    pos = translation;
                    rotq = quaternion;
                }*/
                let node = this.addNode(`bone #${j} for ${objName}`, false, rotq, pos);
                if (<number>bone.parent >= 0) {
                    var parentNode = this._nodes[<number>bone.parent + firstJointNodeIndex];
                    if (parentNode.children === undefined) {
                        parentNode.children = [];
                    }
                    parentNode.children.push(node.index);
                    let p = <number>bone.parent;
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
                    skinMatricesView.set([1,0,0,0, 0,1,0,0, 0,0,1,0,  -pos[0], -pos[1], -pos[2],1], j*4*4);
                }
                //let posp = <number>bone.parent >= 0 ? bones[<number>bone.parent].pos_init as [] : [0,0,0];
                //skinMatricesView.set([1,0,0,0, 0,1,0,0, 0,0,1,0, -posp[0],-posp[1],-posp[2],1], j*4*4);
                //skinMatricesView.set([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], j*4*4);
                posStack.push(pos);
            }

            let bufferDataSkinMatricesIndex = this.addBuffer(bufferDataSkinMatrices, undefined, `${objName} skin data`);
            let bufferViewSkinMatricesIndex = this.addBufferView({
                "name": `${objName}_skin_matrices`,
                "buffer": bufferDataSkinMatricesIndex,
                "byteLength": numJoints*4*4*4,
                "byteOffset": 0,
            });
            let accessorSkinMatricesIndex = this.addAccessor({
                "name": `${objName}_skin_matrices`,
                "bufferView": bufferViewSkinMatricesIndex,
                "byteOffset": 0,
                "componentType": accessorElementSize.FLOAT,
                "count": numJoints,
                "type": accessorType.MAT4,
            });
    
            let skinIndex = this.addSkin({
                "name": `${objName} skin`,
                "inverseBindMatrices": accessorSkinMatricesIndex,
                "joints": joints,
            });

            return { skinIndex, firstJointNodeIndex };

        }

        private createMesh(objName: string, addAsRootNode: boolean = false): NodeIndex | null {

            let obj = this.__objects[objName] as JsonMap;

            let materials = obj.material as [];
            
            let mesh: Mesh = {
                "name": `${objName} mesh`,
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

            let geomData: _GeometryData | null = this._mapNameToGeometry[obj.geometry as string];

            if (geomData == null) {
                geomData = this.createGeometry(obj.geometry as string);
                if (geomData == null) {
                    return null;
                }
                this._mapNameToGeometry[obj.geometry as string] = geomData;
            }

            if (geomData.accessorIndicesIndex.length != materials.length) {
                console.log(`GLTF Converter: Mesh ${objName} has ${materials.length} materials whereas its geometry has ${geomData.accessorIndicesIndex.length}! objects not exported.`, obj, geomData);
                return null;
            }

            for (let mat = 0; mat < materials.length; ++mat) {
                let material: any = materials[mat], map = material.uniforms.map;
                let numTexture: number = map ? parseInt(map.value as string) : -1;
                let userData: any = material.userData;

                let accessorIndicesIndex = geomData.accessorIndicesIndex[mat];
    
                let gmaterial: any = {
                    "name": `${objName} material ${mat}`,
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
                    const animTexture = this.__animatedTextures[userData.animatedTexture.idxAnimatedTexture] as JsonMap;
                    if (!animTexture.scrolltexture || !this.sceneJSON.useUVRotate) {
                        let animCoords: Array<JsonMap> = [];
                        (animTexture.animcoords as Array<JsonMap>).forEach((ac: JsonMap) => {
                            animCoords.push({
                                "minU": ac.minU,
                                "minV": ac.minV,
                                "texture": parseInt((ac.texture as string).substring(7)),
                            });
                        });
                        gmaterial.extras.TRN_behaviours.push({
                            "type":         "animatedTexture",
                            "pos":          userData.animatedTexture.pos,
                            "minU":         userData.animatedTexture.minU,
                            "minV":         userData.animatedTexture.minV,
                            "speed":        animTexture.animspeed,
                            "animCoords":   animCoords,
                        });
                    } else {
                        const coords = (animTexture.animcoords as Array<JsonMap>)[0];
                        const vOffset = (coords.minV as number) - userData.animatedTexture.minV*0.5;
                        gmaterial.extras.TRN_behaviours.push({
                            "type":         "uvRotate",
                            "tileHeight":   TRN.Consts.uvRotateTileHeight,
                            "vOffset":      vOffset,
                        });
                        gmaterial.extras.TRN_materials.uniforms.offsetRepeat = {
                            "value":        [(coords.minU as number) - userData.animatedTexture.minU, vOffset, 1, 0.5],
                        };
                    }
                } else if (obj.hasScrollAnim) {
                    gmaterial.extras.TRN_behaviours.push({
                        "type":             "scrollTexture",
                        "tileHeight":       TRN.Consts.moveableScrollAnimTileHeight,
                    });
                }

                let uniforms = gmaterial.extras.TRN_materials.uniforms;

                for (let n in uniforms) {
                    delete (uniforms[n] as JsonMap).type;
                }

                if (numTexture >= 0) {
                    gmaterial.pbrMetallicRoughness.baseColorTexture = { "index": numTexture };
                } else {
                    this._glc++;
                    console.log('GLTF Converter: No texture for mesh', objName, mat, material, obj);
                }

                if (material.hasAlpha) {
                    gmaterial.alphaMode = "BLEND";
                } else {
                    gmaterial.alphaMode = "MASK";
                    gmaterial.alphaCutoff = 0.5;
                }
            
                let primitive: Primitive = {
                    "attributes": {
                        "POSITION": geomData.accessorPositionIndex,
                        "TEXCOORD_0": geomData.accessorTexcoordIndex,
                        "COLOR_0": geomData.accessorColorIndex,
                        "NORMAL": geomData.accessorNormalIndex,
                        "_flags": geomData.accessorFlagIndex,
                    },
                    "indices": accessorIndicesIndex,
                    "mode": primitiveMode.TRIANGLES,
                    "material": this.addMaterial(gmaterial),
                };

                if (geomData.accessorSkinIndexIndex >= 0) {
                    primitive.attributes["JOINTS_0"]  = geomData.accessorSkinIndexIndex;
                    primitive.attributes["WEIGHTS_0"] = geomData.accessorSkinWeightIndex;
                }

                mesh.primitives.push(primitive);
            }

            let skin: any = this.createSkin(objName, obj.geometry as string, obj.position as vec3, obj.quaternion as vec4);

            let meshNode = this.addNode(objName, addAsRootNode, /*skin != null ? [0,0,0,1] :*/ obj.quaternion as vec4, /*skin != null ? [0,0,0] :*/ obj.position as vec3, /*skin != null ? [1,1,1] :*/ obj.scale as vec3);

            meshNode.node.mesh = this.addMesh(mesh);

            if (skin != null) {
                meshNode.node.skin = skin.skinIndex;
                this._mapNameToSkin[objName] = skin.skinIndex;
                meshNode.node.children = [skin.firstJointNodeIndex];
            }

            return meshNode;
        }

        private outputAnimations(): void {

            const fps = 30;

            for (let name in this.__objects) {
                let obj = this.__objects[name] as JsonMap;

                let hasAnim = obj.has_anims !== undefined ? obj.has_anims as boolean : false;
                let animStartIndex = obj.animationStartIndex !== undefined ? obj.animationStartIndex as number : -1;
                let numAnimations = obj.numAnimations !== undefined ? obj.numAnimations as number : -1;

                //console.log(name, hasAnim, animStartIndex, numAnimations, obj);

                if (!hasAnim || !obj.visible || animStartIndex < 0 || numAnimations <= 0) continue;

                //if (name != "moveable0_0") continue;
                
                // Get the bone positions of the mesh in posStack
                let posStack: Array<Array<number>> = [];

                let embedId = (this.__geometries[obj.geometry as string] as JsonMap).id as string;
                let oembed = this.__embeds[embedId] as JsonMap;

                let bones = oembed.bones as Array<JsonMap>;

                bones.forEach( b => posStack.push( b.pos_init as Array<number> ) );

                let numData = bones.length;

                // 
                let animIndex = 0;
                let track = this.__animTracks[animStartIndex + animIndex] as JsonMap;

                // Calculate the size and create the data buffer
                let bufferTimeSize = 0, bufferDataTransSize = 0, bufferDataQuatSize = 0;
                let keys = track.keys as Array<JsonMap>, bad = false;
                for (let k = 0; k < keys.length; ++k) {
                    let key = keys[k] as JsonMap;
                    let dataKey = key.data as Array<JsonMap>;
                    let numDataKey = dataKey.length;

                    bufferTimeSize += 1;
                    bufferDataTransSize += numData * 3;
                    bufferDataQuatSize += numData * 4;

                    if (numData > numDataKey) {
                        bad = true;
                    }
                }

                if (bad) {
                    console.log('No animation for object ' + name + ' because mismatched number of data in keys! numData=' + numData, obj, track);
                    continue;
                }

                let buffer = new ArrayBuffer(bufferTimeSize * 4 + (bufferDataTransSize + bufferDataQuatSize) * 4);

                // Fill the buffer
                let timeView = new Float32Array(buffer, 0, bufferTimeSize);
                let dataView = new Float32Array(buffer, bufferTimeSize * 4, bufferDataTransSize + bufferDataQuatSize);
                let timeMin = 1e10, timeMax = -1e10;
                for (let k = 0; k < keys.length; ++k) {
                    let key = keys[k] as JsonMap;
                    let data = key.data as Array<JsonMap>;

                    let time = (key.time as number) / fps;

                    timeMin = Math.min(timeMin, time);
                    timeMax = Math.max(timeMax, time);
                    
                    timeView.set([time], k);

                    for (let d = 0; d < numData; ++d) {
                        let trans = (data[d] as JsonMap).position as JsonMap;
                        let quat  = (data[d] as JsonMap).quaternion as JsonMap;

                        let x = trans.x as number + (posStack.length > d ? posStack[d][0] : 0);
                        let y = trans.y as number + (posStack.length > d ? posStack[d][1] : 0);
                        let z = trans.z as number + (posStack.length > d ? posStack[d][2] : 0);
                        
                        dataView.set([x, y, z], d*keys.length*3+k*3);
                        dataView.set([quat.x! as number,  quat.y! as number,  quat.z! as number,  quat.w! as number], d*keys.length*4+k*4+numData*keys.length*3);
                        //dataView.set([0,0,0], d*keys.length*3+k*3)
                        //dataView.set([0,0,0,1], d*keys.length*4+k*4+data.length*keys.length*3)
                    }
                }
    
                let bufferIndex = this.addBuffer(buffer, undefined, `${name} anim #${animIndex}`);
                let bufferViewTimeIndex = this.addBufferView({
                    "name": `${name} anim #${animIndex} time`,
                    "buffer": bufferIndex,
                    "byteLength": bufferTimeSize*4,
                    "byteOffset": 0,
                });
                let accessorTimeIndex = this.addAccessor({
                    "name": `${name} anim #${animIndex} time`,
                    "bufferView": bufferViewTimeIndex,
                    "byteOffset": 0,
                    "componentType": accessorElementSize.FLOAT,
                    "count": keys.length,
                    "type": accessorType.SCALAR,
                    "min": [timeMin],
                    "max": [timeMax],
                });

                let translationViewIndex = this.addBufferView({
                    "name": `${name} anim #${animIndex} data view`,
                    "buffer": bufferIndex,
                    "byteLength": bufferDataTransSize*4,
                    "byteOffset": bufferTimeSize*4,
                });
                let quaternionViewIndex = this.addBufferView({
                    "name": `${name} anim #${animIndex} rotations`,
                    "buffer": bufferIndex,
                    "byteLength": bufferDataQuatSize*4,
                    "byteOffset": bufferTimeSize*4+bufferDataTransSize*4,
                });

                let animation: Animation = {
                    "name": `Animation #${animIndex} for object ${name}`,
                    "channels": [],
                    "samplers": []
                };

                let firstNodeSkin = this._skins[this._mapNameToSkin[name]].joints[0];
                let samplerIndex = 0;

                for (let d = 0; d < numData; ++d) {
                    animation.channels.push({
                        "sampler": samplerIndex++,
                        "target": {
                            "node": firstNodeSkin+d,
                            "path": channelTargetPath.translation,
                        }
                    });
                    animation.channels.push({
                        "sampler": samplerIndex++,
                        "target": {
                            "node": firstNodeSkin+d,
                            "path": channelTargetPath.rotation,
                        }
                    });

                    let accessorTranslationIndex = this.addAccessor({
                        "name": `${name} anim #${animIndex} node #${d} translation`,
                        "bufferView": translationViewIndex,
                        "byteOffset": 3*keys.length*4*d,
                        "componentType": accessorElementSize.FLOAT,
                        "count": keys.length as number,
                        "type": accessorType.VEC3,
                    });
                    let accessorQuaternionIndex = this.addAccessor({
                        "name": `${name} anim #${animIndex} node #${d} quaternion`,
                        "bufferView": quaternionViewIndex,
                        "byteOffset": 4*keys.length*4*d,
                        "componentType": accessorElementSize.FLOAT,
                        "count": keys.length as number,
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

                this.addAnimation(animation);
            }

        } // function outputAnimations

    } // class GLTFConverter

} // TRN namespace
