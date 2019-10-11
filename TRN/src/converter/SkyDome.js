/*
	Ported from the SceneManager::setSkyDome method of Ogre3D engine (https://www.ogre3d.org/docs/api/1.9/class_ogre_1_1_scene_manager.html#add758e3fa5df1291df9ff98b2594d35b)
*/
TRN.SkyDome = {

	create : function(
       /*Real*/ curvature,
       /*Real*/ tiling,
       /*Real*/ distance,
       /*const Quaternion&*/ orientation,
       /*int*/ xsegments, /*int*/ ysegments, /*int*/ ySegmentsToKeep
	)
	{
		const res = { vertices : [], textures : [], faces : [] };

		for (let i = 0; i < 5; ++i) {
			const data = this.createPlane(i, curvature, tiling, distance, orientation, xsegments, ysegments, i!=4/*BP_UP*/ ? ySegmentsToKeep : -1);
			
			const numVertices = res.vertices.length/3;
			for (let f = 0; f < data.faces.length; ++f) res.faces.push(data.faces[f] + numVertices);

			res.vertices = res.vertices.concat(data.vertices);
			res.textures = res.textures.concat(data.textures);
		}

		return res;
	},

	createPlane : function(
       /*BoxPlane*/ bp,
       /*Real*/ curvature,
       /*Real*/ tiling,
       /*Real*/ distance,
       /*const Quaternion&*/ orientation,
       /*int*/ xsegments, /*int*/ ysegments, /*int*/ ysegments_keep) 
	{
	    const BP_FRONT = 0,
		      BP_BACK = 1,
		      BP_LEFT = 2,
		      BP_RIGHT = 3,
		      BP_UP = 4,
		      BP_DOWN = 5;

	    const plane = { constant:distance, normal:[0,0,0] };
	    let   up = [0,1,0];

	    // Set up plane equation
	    switch(bp) {
		    case BP_FRONT:
		        plane.normal = [0,0,1];
		        break;
		    case BP_BACK:
		        plane.normal = [0,0,-1];
		        break;
		    case BP_LEFT:
		        plane.normal = [1,0,0];
		        break;
		    case BP_RIGHT:
		        plane.normal = [-1,0,0];
		        break;
		    case BP_UP:
		        plane.normal = [0,-1,0];
		        up = [0,0,1];
		        break;
		    case BP_DOWN:
		        // no down
		        return null;
	    }

	    // Modify by orientation
        glMatrix.vec3.transformQuat(plane.normal, plane.normal, orientation);
	    glMatrix.vec3.transformQuat(up, up, orientation);

	    // Create new
	    const planeSize = distance * 2;

	    return this.createCurvedIllusionPlane(plane,
	        planeSize, planeSize, curvature,
	        xsegments, ysegments, tiling, tiling, up,
	        orientation, ysegments_keep);
	},

	createCurvedIllusionPlane : function (
        plane,
        /*Real*/ width, /*Real*/ height, /*Real*/ curvature,
        /*int*/ xsegments, /*int*/ ysegments,
        /*Real*/ uTile, /*Real*/ vTile, /*Const Vector3&*/ upVector,
        /*const Quaternion&*/ orientation, 
        /*int*/ ySegmentsToKeep)
    {
		const params = {
                plane : plane,
                width : width,
                height : height,
                curvature : curvature,
                xsegments : xsegments,
                ysegments : ysegments,
                xTile : uTile,
                yTile : vTile,
                upVector : upVector,
                orientation : orientation,
                ySegmentsToKeep : ySegmentsToKeep
		};
		return this.loadManualCurvedIllusionPlane(params);
	},

	loadManualCurvedIllusionPlane : function(params) {
		const vertCoords = [], textCoords = [];

        if (params.ySegmentsToKeep == -1) params.ySegmentsToKeep = params.ysegments;

        if ((params.xsegments + 1) * (params.ySegmentsToKeep + 1) > 65536)
            throw "Plane tessellation is too high, must generate max 65536 vertices";

        // Work out the transform required
        // Default orientation of plane is normal along +z, distance 0
    
        // Determine axes
        const zAxis = glMatrix.vec3.clone(params.plane.normal);
        glMatrix.vec3.normalize(zAxis, zAxis);
        const yAxis = glMatrix.vec3.clone(params.upVector);
        glMatrix.vec3.normalize(yAxis,yAxis);
        const xAxis = glMatrix.vec3.create();
        glMatrix.vec3.cross(xAxis, yAxis, zAxis);
        if (glMatrix.vec3.squaredLength(xAxis) == 0) {
            //upVector must be wrong
            throw "The upVector you supplied is parallel to the plane normal, so is not valid.";
        }
        glMatrix.vec3.normalize(xAxis, xAxis);

        const rot = glMatrix.mat4.create();
		glMatrix.mat4.set(rot,
			xAxis[0], xAxis[1], xAxis[2], 0,
			yAxis[0], yAxis[1], yAxis[2], 0,
			zAxis[0], zAxis[1], zAxis[2], 0,
			0,        0,        0,        1
		);

        // Set up standard transform from origin
        const xlate = glMatrix.mat4.create(); // create an identity matrix
        const pnormal = glMatrix.vec3.clone(params.plane.normal);
        glMatrix.vec3.scale(pnormal, pnormal, -params.plane.constant);
        xlate[12] = pnormal[0];
        xlate[13] = pnormal[1];
        xlate[14] = pnormal[2];

        // concatenate
        const xform = glMatrix.mat4.clone(xlate);
        glMatrix.mat4.multiply(xform, xform, rot);

        // Generate vertex data
        // Imagine a large sphere with the camera located near the top
        // The lower the curvature, the larger the sphere
        // Use the angle from viewer to the points on the plane
        // Credit to Aftershock for the general approach

        // Actual values irrelevant, it's the relation between sphere radius and camera position that's important
        const SPHERE_RAD = 100.0,
              CAM_DIST = 5.0;

        const sphereRadius = SPHERE_RAD - params.curvature,
              camPos = sphereRadius - CAM_DIST; // Camera position relative to sphere center

        const xSpace = params.width / params.xsegments,
              ySpace = params.height / params.ysegments,
              halfWidth = params.width / 2,
              halfHeight = params.height / 2,
              invOrientation = glMatrix.quat.clone(params.orientation);

        glMatrix.quat.invert(invOrientation, invOrientation);

        for (let y = params.ysegments - params.ySegmentsToKeep; y < params.ysegments + 1; ++y) {
            for (let x = 0; x < params.xsegments + 1; ++x) {
                // Work out centered on origin
                const vec = glMatrix.vec3.fromValues(
                	    (x * xSpace) - halfWidth,
                	    (y * ySpace) - halfHeight,
                	    0.0);

                // Transform by orientation and distance
                glMatrix.vec3.transformMat4(vec, vec, xform);

                // Assign to geometry
                vertCoords.push(vec[0], vec[1], vec[2]);

                // Generate texture coords
                // Normalise position
                // modify by orientation to return +y up
                glMatrix.vec3.transformQuat(vec, vec, invOrientation)
                glMatrix.vec3.normalize(vec, vec);

                // Find distance to sphere
                const sphDist = Math.sqrt(camPos*camPos * (vec[1]*vec[1]-1.0) + sphereRadius*sphereRadius) - camPos*vec[1]; // Distance from camera to sphere along box vertex vector

                vec[0] *= sphDist;
                vec[2] *= sphDist;

                // Use x and y on sphere as texture coordinates, tiled
                const s = vec[0] * (0.01 * params.xTile),
                      t = 1.0 - (vec[2] * (0.01 * params.yTile));

                textCoords.push(s, t);
            } // x
        } // y

        const faceIndices = this.tesselate2DMesh(params.xsegments + 1, params.ySegmentsToKeep + 1, false);

		return { vertices : vertCoords, textures : textCoords, faces : faceIndices };
	},

    tesselate2DMesh : function(/*unsigned short*/ meshWidth, /*unsigned short*/ meshHeight, /*bool*/ doubleSided) {
        // Make a list of indexes to spit out the triangles
        let vInc = 1, v = 0, iterations = doubleSided ? 2 : 1;
        let indices = [];

        while (iterations--) {
            // Make tris in a zigzag pattern (compatible with strips)
            let u = 0,
                uInc = 1, // Start with moving +u
                vCount = meshHeight - 1;

            while (vCount--) {
                let uCount = meshWidth - 1;
                while (uCount--) {
                    // First Tri in cell
                    indices.push(
                    	((v + vInc) * meshWidth) + u,
                    	(v * meshWidth) + u,
                    	((v + vInc) * meshWidth) + (u + uInc)
                    );

                    // Second Tri in cell
                    indices.push(
	                    ((v + vInc) * meshWidth) + (u + uInc),
	                    (v * meshWidth) + u,
	                    (v * meshWidth) + (u + uInc)
	                );

                    // Next column
                    u += uInc;
                }

                // Next row
                v += vInc;
                u = 0;
            }

            // Reverse vInc for double sided
            v = meshHeight - 1;
            vInc = -vInc;
        }
        return indices;
    }
};
