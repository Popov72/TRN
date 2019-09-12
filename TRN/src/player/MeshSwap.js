TRN.MeshSwap = function(obj1, obj2) {
	
	this.obj1 = obj1;
	this.obj2 = obj2;

}

TRN.MeshSwap.prototype = {

	constructor : TRN.MeshSwap,

	swap : function (meshIndices) {

		for (var i = 0; i < meshIndices.length; ++i) {
            var obj1 = this.findChild(this.obj1, meshIndices[i]), obj1Children = obj1.children;
            var obj2 = this.findChild(this.obj2, meshIndices[i]), obj2Children = obj2.children;
            
            obj1.parent.remove(obj1);
            obj2.parent.remove(obj2);

            obj1.children = obj2Children;
            obj2.children = obj1Children;
            
            this.obj2.add(obj1);
            this.obj1.add(obj2);

            obj1.children.forEach(c => c.parent = obj1);
            obj2.children.forEach(c => c.parent = obj2);
            
            obj1.visible = true;
            obj2.visible = false;
		}

	},

	swapall : function() {
        console.log('swapall')
		var g = this.obj1.geometry, m = this.obj1.material;

		this.obj1.geometry = this.obj2.geometry;
		this.obj1.material = this.obj2.material;

		this.obj2.geometry = g;
		this.obj2.material = m;

		delete this.obj1.__webglInit; // make three js regenerates the webgl buffers
		delete this.obj2.__webglInit;

        /*var bones = this.parent1.children.filter(c => c instanceof THREE.Bone);

        var parent1 = this.parent1.parent;
        var parent2 = this.parent2.parent;

        var srcMesh = this.parent1;

        function copySkin(parent, children) {
            var newChildren = children.filter( c => c instanceof THREE.SkinnedMesh );
            if (parent) parent.children = newChildren;
            newChildren.forEach(c => {
                c.boneMatrices = srcMesh.boneMatrices;
                c.geometry.boundingBox = srcMesh.geometry.boundingBox;
                c.geometry.boundingSphere = srcMesh.geometry.boundingSphere;
                //c.updateMatrixWorld = THREE.Mesh.prototype.updateMatrixWorld;
                if (c.children) copySkin(c, c.children);
            });
        }
        copySkin(null, [this.parent2]);

        this.parent2.position = this.parent1.position;
        this.parent2.rotation = this.parent1.rotation;

        //this.parent2.updateMatrixWorld();

        parent1.add(this.parent2);
        parent2.add(this.parent1);

        bones.forEach(b => this.parent2.add(b));

        this.parent2.traverse(o => { o.visible = true; });
        this.parent1.traverse(o => { o.visible = false; });

        console.log(this.parent1, this.parent2)
        console.log(parent1, parent2);*/

        /*var bones = this.parent2.children.filter(c => c instanceof THREE.Bone);

        var parent1 = this.parent1.parent;
        var parent2 = this.parent2.parent;

        var obj1Children = this.parent1.children;
        var obj2Children = this.parent2.children;

        this.parent1.children = obj2Children;
        this.parent2.children = obj1Children;

        bones.forEach(b => this.parent1.add(b));

        parent1.add(this.parent2);
        parent2.add(this.parent1);

        this.parent1.traverse(o => { o.visible = true; });
        this.parent2.traverse(o => { o.visible = false; });*/
	},

	findChild : function (obj, idx) {

        if (obj.name.endsWith('_' + idx)) {
            return obj;
        }

        var found = null;

        for (var i = 0; i < obj.children.length; ++i) {
            found = this.findChild(obj.children[i], idx);
            if (found) {
                break;
            }
        }

        return found;

    }
}
