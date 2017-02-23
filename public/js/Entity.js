function Entity( args ) {
	this.id = args.id;
	this.geometry = new THREE.SphereGeometry(8, 10, 10);
	this.material = new THREE.MeshPhongMaterial({
		color: args.color || '#191919'
	});

	this.mesh = new THREE.Mesh(this.geometry, this.material);
	this.cell = getCell(args.cell.q, args.cell.r, args.cell.s);

	this.setPosition(this.cell);
	this.controllable = args.controllable;
	this.is_moving = false;

	if ( this.controllable ) {
		if ( args.moving_restrictions ) {
			this.moving_restrictions = vg.Tools.merge( this.moving_restrictions, args.moving_restrictions );
		}
		this.find_possible_moves(this.get_current_cell(), 10);
	}

	scene.add(this.mesh);
	return this;
}

Entity.prototype = {
	id: "",
	moving_interval: 0,
	path: [],
	possible_moves: [],
	possible_moves_meshes: [],
	drawing_possible_moves: 0,
	geometry: null,
	material: null,
	mesh: null,
	
	moving_restrictions: {
		water: false,
		grass: true,
		mountain: true,
		mud: true,
		to_higher: 20,
		to_lower: 20,
		tree: false
	},

	setPosition: function( cell ) {
		this.mesh.position.x = cell.tile.position.x;
		this.mesh.position.y = cell.tile.position.y + cell.h + 8;
		this.mesh.position.z = cell.tile.position.z;

		this.coordinates = {
			q: cell.q,
			r: cell.r,
			s: cell.s,
		}
	},

	update: function( args ) {
		if (args.actions) {
			this.doActions(args.actions);
		}
		else if (args.position) {
			this.clear_possible_moves();
			// this.move(grid.cells[args.position.q + '.' + args.position.r + '.' + args.position.s]);
		}
	},

	doActions: function( actions ) {
		while( action = actions.pop() ) {
			switch( action.type ) {
				case 'move':
					this.moveAlongPath(action.path);
					break;
			}
		}
	},

	move: function( target_cell ) {
		unhighlight_cell(target_cell, 'moving_path');
		this.setPosition(target_cell);
	},

	createPath: function( destination ) {
		var current_cell = this.get_current_cell();
		if (this.path.length) {
			for( var i = 0; i < this.path.length; i++ ) {
				unhighlight_cell( this.path[i], 'moving_path' );
			}
		}

		board.finder.heuristicFilter = this.move_is_legal.bind(this);
		var path = board.findPath(current_cell.tile, destination.tile, null, 10);
		if (path) {

			var compressed_path = [];
			for (var i in path) {
				if ( path.hasOwnProperty(i) ) {
					compressed_path.push( compressCellData(path[i]) );
				}
			}

			socket.emit('entity action', {
				server_id: window.server_id,
				entities: [{
					id: this.id,
					position: {
						q: destination.q,
						r: destination.r,
						s: destination.s
					},
					actions: [{
						type: 'move',
						path: compressed_path
					}]
				}]
			});
		}
		else {
			this.is_moving = false;
		}
	},

	get_current_cell: function() {
		return grid.cells[this.coordinates.q + '.' + this.coordinates.r + '.' + this.coordinates.s];
	},

	moveAlongPath: function(path) {
		this.clear_possible_moves();

		var decompressedPath = [];
		for ( var i = 0; i < path.length; i++ ) {
			decompressedPath.push(getCell(path[i].position.q, path[i].position.r, path[i].position.s));
		}

		this.path = decompressedPath;
		for( var i = 0; i < this.path.length; i++ ) {
			highlight_cell( this.path[i], 'moving_path' );
		}

		this.path.reverse();

		( function( path, self ){
			self.moving_interval = setInterval( function() {
				var cell = path.pop();
				if (cell) {
					self.move(cell);
				}
				else {
					clearInterval(self.moving_interval);
					self.moving_interval = 0;

					if (self.controllable) {
						self.find_possible_moves(self.get_current_cell(), 10);
					}
				}
			}, 100);
		})(this.path, this);
	},

	find_possible_moves: function( cell, maxDistance, currentDistance ) {
		if ( !currentDistance && currentDistance !== 0 ) {
			currentDistance = 0;
		}

		this.drawing_possible_moves++;

		(function( self, cell, currentDistance ) {
			requestAnimationFrame(function() {

				if ( !cell.userData.possible_moves_checked ) {
					cell.userData.possible_moves_checked = true;
					var neighbors = grid.getNeighbors(cell);
					currentDistance++;
					if ( maxDistance >= currentDistance ) {
						for ( var i = 0; i < neighbors.length; i++ ) {
							if ( self.move_is_legal( cell, neighbors[i] ) ) {
								var mesh = highlight_cell(neighbors[i], 'possible_move', true);
								if ( mesh ) {
									self.add_possible_move( mesh, cell );
								}
								self.find_possible_moves( neighbors[i], maxDistance, currentDistance );
							}
						}
					}
				}
				if ( --self.drawing_possible_moves == 0 ) {
					self.possible_moves_ready();
				}
			});
		})(this, cell, currentDistance);
	},

	add_possible_move: function( mesh, cell ) {
		this.possible_moves.push( cell );
		this.possible_moves_meshes.push( mesh );
	},

	clear_possible_moves: function() {
		scene.remove(this.merged_possible_moves);
		
		grid.traverse(function( cell ) {
			cell.userData.possible_move = null;
			cell.userData.moving_path = null;
		});

		for ( var cell_i in this.possible_moves ) {
			if ( this.possible_moves.hasOwnProperty(cell_i) ) {
				this.possible_moves[cell_i].userData.possible_move = null;
				this.possible_moves[cell_i].userData.moving_path = null;
			}
		}

		this.possible_moves_meshes = [];
	},

	possible_moves_ready: function() {
		grid.traverse(function( cell ) {
			cell.userData.possible_moves_checked = false;
		});

		this.merged_possible_moves = mergeMeshes(this.possible_moves_meshes);
		scene.add(this.merged_possible_moves);

		this.is_moving = false;
	},

	move_is_legal: function( current_cell, target_cell ) {
		var legal = false;
		var moving_restrictions = this.moving_restrictions;

		switch ( target_cell.userData.type ) {
			case 'water':
				legal = moving_restrictions.water;
				break;
			case 'grass':
				legal = moving_restrictions.grass;
				break;
			case 'mountain':
				legal = moving_restrictions.mountain;
				break;
			case 'mud':
				legal = moving_restrictions.mud;
				break;
		}

		var cant_tree = target_cell.userData.has_tree && !moving_restrictions.tree;
		if ( !legal || cant_tree ) {
			return false;
		}

		if ( current_cell.h > target_cell.h ) {
			legal = current_cell.h - target_cell.h <= moving_restrictions.to_lower;
		}
		else if ( current_cell.h < target_cell.h ) {
			legal = target_cell.h - current_cell.h <= moving_restrictions.to_higher;
		}

		return legal;
	},

	move_player: function (evt) {
		if (!this.is_moving) {
			this.is_moving = true;

			var mouseX = ( evt.clientX / window.innerWidth ) * 2 - 1;
			var mouseY = -( evt.clientY / window.innerHeight ) * 2 + 1;

			var vector = new THREE.Vector3( mouseX, mouseY, scene.camera.near );

			// Convert the [-1, 1] screen coordinate into a world coordinate on the near plane
			var projector = new THREE.Projector();
			projector.unprojectVector( vector, scene.camera );

			var raycaster = new THREE.Raycaster( scene.camera.position, vector.sub( scene.camera.position ).normalize() );
			
			var intersects = raycaster.intersectObject(merged_group, true);

			if ( intersects.length ) {
				var click_pos = intersects[0].point;
				var cell = grid.pixelToCell(click_pos);
				cell = grid.cells[cell.q + '.' + cell.r + '.' + cell.s];
				
				this.createPath( cell );
			}
		}
	}
}

Entity.prototype.constructor = Entity;