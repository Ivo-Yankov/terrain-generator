var spinningMeshes = [];

function createEntityMesh(args) {
    var geometry, material, mesh;
    switch (args.type) {
        case "rock":
            geometry = new THREE.DodecahedronGeometry(7);
            material = new THREE.MeshPhongMaterial({color: args.color || '#c1c1c1'});
            mesh = new THREE.Mesh(geometry, material);
            spinningMeshes.push(mesh);

            break;

        case "player":
            geometry = new THREE.SphereGeometry(8, 10, 10);
            material = new THREE.MeshPhongMaterial({color: args.color || '#191919'});
            mesh = new THREE.Mesh(geometry, material);
            break;

        default:
            geometry = new THREE.CylinderGeometry(7, 7, 2, 32);
            material = new THREE.MeshPhongMaterial({color: args.color || '#daf101'});
            mesh = new THREE.Mesh(geometry, material);
            rotateAroundObjectAxis(mesh, new THREE.Vector3(1,0,0), Math.PI / 2);
            spinningMeshes.push(mesh);
    }

    return mesh;
}

function rotateAroundObjectAxis(object, axis, radians) {
    var rotObjectMatrix = new THREE.Matrix4();
    rotObjectMatrix.makeRotationAxis(axis.normalize(), radians);

    // old code for Three.JS pre r54:
    // object.matrix.multiplySelf(rotObjectMatrix);      // post-multiply
    // new code for Three.JS r55+:
    object.matrix.multiply(rotObjectMatrix);

    // old code for Three.js pre r49:
    // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
    // old code for Three.js r50-r58:
    // object.rotation.setEulerFromRotationMatrix(object.matrix);
    // new code for Three.js r59+:
    object.rotation.setFromRotationMatrix(object.matrix);
}

function rotateAroundWorldAxis(object, axis, radians) {
    var rotWorldMatrix = new THREE.Matrix4();
    rotWorldMatrix.makeRotationAxis(axis.normalize(), radians);

    // old code for Three.JS pre r54:
    //  rotWorldMatrix.multiply(object.matrix);
    // new code for Three.JS r55+:
    rotWorldMatrix.multiply(object.matrix);                // pre-multiply

    object.matrix = rotWorldMatrix;

    // old code for Three.js pre r49:
    // object.rotation.getRotationFromMatrix(object.matrix, object.scale);
    // old code for Three.js pre r59:
    // object.rotation.setEulerFromRotationMatrix(object.matrix);
    // code for r59+:
    object.rotation.setFromRotationMatrix(object.matrix);
}

var lastTime = Date.now();

function UpdateEntityAnimationFrame() {
    requestAnimationFrame(UpdateEntityAnimationFrame);
    var now = Date.now();
    var dTime = now - lastTime;
    lastTime = now;
    var rotationY = 0.001 * dTime;
    for (var i = 0; i < spinningMeshes.length; i++) {
        rotateAroundWorldAxis(spinningMeshes[i], new THREE.Vector3(0,1,0), rotationY);
    }
}