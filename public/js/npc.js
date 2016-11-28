window.addEventListener('merging_complete', function(evt) {
	
	// Adds an object that is going to do stuff... I dont know what exactly yet
	for (var i = 0; i < 1; i++) {
		addNPC();
	}

	board.finder.heuristicFilter = move_is_legal;
});
	
window.addEventListener('click', function(evt) {
	if ( window.player ) {
		clearInterval(window.player.moving_interval);
	}

	var mouseX = ( evt.clientX / window.innerWidth ) * 2 - 1;
	var mouseY = -( evt.clientY / window.innerHeight ) * 2 + 1;

	var vector = new THREE.Vector3( mouseX, mouseY, scene.camera.near );

	// Convert the [-1, 1] screen coordinate into a world coordinate on the near plane
	var projector = new THREE.Projector();
	projector.unprojectVector( vector, scene.camera );

	var raycaster = new THREE.Raycaster( scene.camera.position, vector.sub( scene.camera.position ).normalize() );
	
	var intersects = raycaster.intersectObject(merged_group, true);

	if( intersects.length ) {
		var click_pos = intersects[0].point;
		var cell = grid.pixelToCell(click_pos);
		cell = grid.cells[cell.q + '.' + cell.r + '.' + cell.s];
		
		window.player.createPath( cell );
	}
});

function NPC ( args ) {

	this.moving_interval = 0;

	this.setPosition = function( cell ) {
		this.mesh.position.x = cell.tile.position.x;
		this.mesh.position.y = cell.tile.position.y + cell.h + 8;
		this.mesh.position.z = cell.tile.position.z;

		this.coordinates = {
			q: cell.q,
			r: cell.r,
			s: cell.s,
		}
	}

	this.move = function( target_cell ) {
		// var current_cell = grid.cells[this.coordinates.q + '.' + this.coordinates.r + '.' + this.coordinates.s];
		this.setPosition(target_cell);
	}

	this.createPath = function( destination ) {
		var current_cell = grid.cells[this.coordinates.q + '.' + this.coordinates.r + '.' + this.coordinates.s];
		
		var path = board.findPath(current_cell.tile, destination.tile);
		if (path) {
			path.reverse();
			( function( path ){			
				window.player.moving_interval = setInterval( function() {
					var cell = path.pop();
					if (cell) {
						window.player.move(cell);
					}
					else {
						clearInterval(window.player.moving_interval);
					}
				}, 100);
			})(path);
		}
	}

	this.geometry = new THREE.SphereGeometry(8, 10, 10);  
	this.material = new THREE.MeshPhongMaterial({
		color: '#191919'
	});

	this.mesh = new THREE.Mesh(this.geometry, this.material);  
	this.mesh.position.x = 100;
	this.mesh.position.y = 100;

	return this;
}

function addNPC() {
	var npc = new NPC();

	npc.setPosition(grid.cells['0.0.0']);

	window.player = npc;

	scene.add(npc.mesh);
}

moving_restrictions = {
	move_on_water: false,
	move_on_grass: true,
	move_on_mountain: true,
	move_on_mud: true,
	to_higher: 20,
	to_lower: 20,
	move_to_tree: false
}

move_is_legal = function( current_cell, target_cell ) {

	var legal = false;

	switch ( target_cell.userData.type ) {
		case 'water':
			legal = moving_restrictions.move_on_water;
			break;
		case 'grass':
			legal = moving_restrictions.move_on_grass;
			break;
		case 'mountain':
			legal = moving_restrictions.move_on_mountain;
			break;
		case 'mud':
			legal = moving_restrictions.move_on_mud;
			break;
	}

	var cant_move_to_tree = target_cell.userData.has_tree && !moving_restrictions.move_to_tree;
	if ( !legal || cant_move_to_tree ) {
		return false;
	}

	if ( current_cell.h > target_cell.h ) {
		legal = current_cell.h - target_cell.h <= moving_restrictions.to_lower;
	}
	else if ( current_cell.h < target_cell.h ) {
		legal = target_cell.h - current_cell.h <= moving_restrictions.to_higher;
	}

	return legal;
}