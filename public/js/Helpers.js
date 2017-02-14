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

function getRandomSeed() {
	var seed = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for( var i=0; i < 20; i++ ) {
		seed += possible.charAt(Math.floor(Math.random() * possible.length));
	}

	return seed;
}

// Downloads a json with the whole grid data
function getJSON() {
	var data = [];

	for(var cell_index in board.grid.cells) {
		var cell = board.grid.cells[cell_index];
		ob = {
			q: cell.q,
			r: cell.r,
			s: cell.s,
			h: cell.h,
			type: cell.userData.type
		}

		if (cell.userData.features) {
			ob.features = cell.userData.features;
		}

		data.push(ob);
	}

	var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
	$('#downloadAnchorElem').remove();
	$(document).appent($('<a id="downloadAnchorElem" style="display:none"></a>'));
	var dlAnchorElem = document.getElementById('downloadAnchorElem');
	dlAnchorElem.setAttribute("href",     dataStr     );
	dlAnchorElem.setAttribute("download", "scene.json");
	dlAnchorElem.click();
}