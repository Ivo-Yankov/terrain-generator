function highlight_cell( cell, highlight_type, return_mesh ) {
	if ( !cell.userData[highlight_type] ) {
		var color, opacity;

		if ( highlight_type == 'moving_path' ) {
			color = 0x2660ff;
			opacity = 0.8;
		}
		else if ( highlight_type == 'possible_move' ) {
			color = 0xb7caff;
			opacity = 1;
		}

		var geometry = new THREE.CylinderGeometry( 5, 5, 5, 32 );
		var material = new THREE.MeshBasicMaterial( {color: color, opacity: opacity} );
		var highlight = new THREE.Mesh( geometry, material );
		highlight.position.x = cell.tile.position.x;
		highlight.position.z = cell.tile.position.z;
		highlight.position.y = cell.tile.position.y + cell.h;
		cell.userData[highlight_type] = highlight;
		if ( !return_mesh ) {
			scene.add(highlight);
		}
		else {
			return highlight;
		}
	}
}

function unhighlight_cell( cell, highlight_type ) {
	highlight = cell.userData[highlight_type];
	if ( highlight ) {
		scene.remove(highlight);
		delete cell.userData[highlight_type];
	}
}

function mergeMeshes (meshArr) {
    var geometry = new THREE.Geometry();

    var material = meshArr[0].material;

    for (var i = 0; i < meshArr.length; i++) {
    	meshArr[i].updateMatrix();
        geometry.merge(meshArr[i].geometry, meshArr[i].matrix);
    }

    return new THREE.Mesh(geometry, material);
};	

function generate_map() {
	window.socket.emit('create server', {
		size: document.getElementById('size').value,
		seed: document.getElementById('seed').value
	});
}

function load_map( data ) {
	var form = document.getElementById('generate-map-form');
	form.remove();
	window.server_id = data.server_id;

	generator = new TerrainLoader({
		size: data.map_data.size,
		seed: data.map_data.seed,
		grid_data: data.map_data.grid
	});

	(function(entities){
		window.addEventListener('map loaded', function(e) {
			entityCollection.refreshEntities(entities);
		});
	})(data.entities);
}

function getCell(q, r, s) {
	return board.grid.cells[ q + '.' + r + '.' + s ];
}

// TODO: find why there is a error in these seeds:
// 7wWq8RLlFnQYGVK3ULuw
// LmR39CWSVRkNndjenDCx