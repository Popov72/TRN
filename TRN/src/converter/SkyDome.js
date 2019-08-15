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
		var res = { vertices : [], textures : [], faces : [] };

		for (var i = 0; i < 5; ++i) {
			var data = this.createPlane(i, curvature, tiling, distance, orientation, xsegments, ysegments, i!=4/*BP_UP*/ ? ySegmentsToKeep : -1);
			
			var numVertices = res.vertices.length/3;
			for (var f = 0; f < data.faces.length; ++f) res.faces.push(data.faces[f] + numVertices);

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
	    var BP_FRONT = 0,
		    BP_BACK = 1,
		    BP_LEFT = 2,
		    BP_RIGHT = 3,
		    BP_UP = 4,
		    BP_DOWN = 5;

	    var plane = new THREE.Plane();
	    var up = new THREE.Vector3(0, 1, 0);

	    // Set up plane equation
	    plane.constant = distance;
	    plane.normal = new THREE.Vector3();
	    switch(bp) {
		    case BP_FRONT:
		        plane.normal.set(0, 0, 1);
		        break;
		    case BP_BACK:
		        plane.normal.set(0, 0, -1);
		        break;
		    case BP_LEFT:
		        plane.normal.set(1, 0, 0);
		        break;
		    case BP_RIGHT:
		        plane.normal.set(-1, 0, 0);
		        break;
		    case BP_UP:
		        plane.normal.set(0, -1, 0);
		        up.set(0, 0, 1);
		        break;
		    case BP_DOWN:
		        // no down
		        return null;
	    }

	    // Modify by orientation
	    plane.normal.applyQuaternion(orientation);
	    up.applyQuaternion(orientation);

	    // Create new
	    var planeSize = distance * 2;

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
		var params = {
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
		var vertCoords = [], textCoords = [];

        if (params.ySegmentsToKeep == -1) params.ySegmentsToKeep = params.ysegments;

        if ((params.xsegments + 1) * (params.ySegmentsToKeep + 1) > 65536)
            throw "Plane tessellation is too high, must generate max 65536 vertices";

        // Work out the transform required
        // Default orientation of plane is normal along +z, distance 0
    
        // Determine axes
        var zAxis = params.plane.normal.clone().normalize();
        var yAxis = params.upVector.clone().normalize();
        var xAxis = (new THREE.Vector3()).crossVectors(yAxis, zAxis);
        if (xAxis.lengthSq() == 0) {
            //upVector must be wrong
            throw "The upVector you supplied is parallel to the plane normal, so is not valid.";
        }
        xAxis.normalize();

        var rot = new THREE.Matrix4();
		rot.set(
			xAxis.x, yAxis.x, zAxis.x, 0,
			xAxis.y, yAxis.y, zAxis.y, 0,
			xAxis.z, yAxis.z, zAxis.z, 0,
			0, 0, 0, 1
		);

        // Set up standard transform from origin
        var xlate = new THREE.Matrix4();
        xlate.identity().setPosition(params.plane.normal.clone().multiplyScalar(-params.plane.constant));

        // concatenate
        var xform = (new THREE.Matrix4()).multiplyMatrices(xlate, rot);

        // Generate vertex data
        // Imagine a large sphere with the camera located near the top
        // The lower the curvature, the larger the sphere
        // Use the angle from viewer to the points on the plane
        // Credit to Aftershock for the general approach

        // Actual values irrelevant, it's the relation between sphere radius and camera position that's important
        var SPHERE_RAD = 100.0;
        var CAM_DIST = 5.0;

        var sphereRadius = SPHERE_RAD - params.curvature;
        var /* Real */ camPos = sphereRadius - CAM_DIST; // Camera position relative to sphere center

        var xSpace = params.width / params.xsegments;
        var ySpace = params.height / params.ysegments;
        var halfWidth = params.width / 2;
        var halfHeight = params.height / 2;
        var invOrientation = (new THREE.Quaternion()).copy(params.orientation).inverse();

        for (var y = params.ysegments - params.ySegmentsToKeep; y < params.ysegments + 1; ++y) {
            for (var x = 0; x < params.xsegments + 1; ++x) {
                // Work out centered on origin
                var vec = new THREE.Vector3(
                	(x * xSpace) - halfWidth,
                	(y * ySpace) - halfHeight,
                	0.0);

                // Transform by orientation and distance
                vec.applyMatrix4(xform);

                // Assign to geometry
                vertCoords.push(vec.x, vec.y, vec.z);

                // Generate texture coords
                // Normalise position
                // modify by orientation to return +y up
                vec.applyQuaternion(invOrientation).normalize();

                // Find distance to sphere
                var sphDist = Math.sqrt(camPos*camPos * (vec.y*vec.y-1.0) + sphereRadius*sphereRadius) - camPos*vec.y; // Distance from camera to sphere along box vertex vector

                vec.x *= sphDist;
                vec.z *= sphDist;

                // Use x and y on sphere as texture coordinates, tiled
                var s = vec.x * (0.01 * params.xTile);
                var t = 1.0 - (vec.z * (0.01 * params.yTile));

                textCoords.push(s, t);
            } // x
        } // y

        var faceIndices = this.tesselate2DMesh(params.xsegments + 1, params.ySegmentsToKeep + 1, false);

		return { vertices : vertCoords, textures : textCoords, faces : faceIndices };
	},

    tesselate2DMesh : function(/*unsigned short*/ meshWidth, /*unsigned short*/ meshHeight, /*bool*/ doubleSided) {
        // Make a list of indexes to spit out the triangles
        var vInc = 1, v = 0, iterations = doubleSided ? 2 : 1;
        var indices = [];

        while (iterations--) {
            // Make tris in a zigzag pattern (compatible with strips)
            var u = 0;
            var uInc = 1; // Start with moving +u
            var vCount = meshHeight - 1;

            while (vCount--) {
                var uCount = meshWidth - 1;
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
