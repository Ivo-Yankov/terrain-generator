TerrainGenerator = function(args) {

	// Define global variables
	var min_snow_height = 150;
	var meshes_to_combine = [];

	// Create a random seed of none is provided
	var seed = args.seed || getRandomSeed();
	Math.seedrandom(seed);
	console.log( 'Generating terrain with seed: ' + seed );

	var size = args.size || 40;

	var tileScale = 0.95;

	var terrain_is_generating = 0;
	var rivers_are_generating = 0;
	var trees_are_generating = 0;
	var cover_tiles_are_generating = 0;
	var merging = 0;

	var objectTypes = {
		'grass' : {
			'r': 0.262745098,
			'g': 0.690196079,
			'b': 0.164705882
		}, 
		'water' : {
			'r': 0.2,
			'g': 0.2,
			'b': 1
		},
		'mountain' : {
			'r': 0.352941177,
			'g': 0.301960784,
			'b': 0.254901961
		},
		'mud' : {
			'r': 0.498039216,
			'g': 0.247058824,
			'b': 0
		},
		'tree-trunk' : {
			'r': 0.325490196,
			'g': 0.192156863,
			'b': 0.094117647
		},	
		'leaves' : {
			'r': 0.22745098,
			'g': 0.37254902,
			'b': 0.145098039
		},
		'snow' : {
			'r': 0.95,
			'g': 0.95,
			'b': 0.95
		}			
	};

	function init() {

		scene = new vg.Scene({
			element: document.getElementById('view'),
			cameraPosition: {x:1380, y:710, z:1327}
		}, {
			maxDistance: 2000,
		});

		grid = new vg.HexGrid({
			cellSize: 11
		});

		grid.generate({
			size: size
		});

		board = new vg.Board(grid);

		board.generateTilemap({
			tileScale: tileScale
		});

		// scene.add(board.group);
		
		addSkyBox();

		generate_terrain();
		
		update();
	};

	window.addEventListener('terrain_generated', function(evt) {
		console.log('terrain_generated');
		// Starts the generation of the rivers after the terrain is completed
		generate_river_flow();
	});

	window.addEventListener('rivers_generated', function(evt) {
		console.log('rivers_generated');
		// Creates trees on grass and mountain tiles
		batch_generate( generate_tree, 'trees' );

	});

	window.addEventListener('trees_generated', function(evt) {
		console.log('trees_generated');
		// Adds snow to the higher mountains and grass to the lower mountains
		batch_generate( generate_cover_tile, 'covers' )
	});

	window.addEventListener('generation_complete', function(evt) {
		console.log('generation_complete');
		// Merges all geometries with the same materials into single objects
		// This greatly improves the performance
		mergeGeometries();
	});

	window.addEventListener('merging_complete', function(evt) {
		console.log('merging_complete');
		
		// Adds an object that is going to do stuff... I dont know what exactly yet
		
		for (var i = 0; i < 1; i++) {
			addNPC();
		}
	});



	function update() {
		scene.render();
		requestAnimationFrame(update);
	}	

	function generate_terrain() {
		// Set all cells to water
		for ( cell_index in grid.cells ) {
			if( grid.cells.hasOwnProperty(cell_index) ) {
				var cell = grid.cells[cell_index];
				setObjectType(cell, 'water');
			}
		}

		// Creates the starting tiles for the mountains and islands
		for ( cell_index in grid.cells ) {
			if ( grid.cells.hasOwnProperty(cell_index) ) {
				var cell = grid.cells[cell_index];
				var height_rand_seed = Math.random() * 100;

				// Generate a mountain
				if ( height_rand_seed >= 99.95 ) {
					height_value = Math.floor( Math.random() * 200 + 80 );
					setHeight(cell, height_value)
					smooth_height( cell, 0, 'steep' );
				}

				// Generate a flat land island
				else if ( height_rand_seed >= 99.90 ) {
					height_value = Math.floor( Math.random() * 15 + 10 );
					setHeight(cell, height_value)
					smooth_height( cell, 0, 'flat' );
				}
			}
		}
	}

	function smooth_height( origin_cell, distance, method ) {
		terrain_is_generating++;
		requestAnimationFrame( function() {
			distance++;
			var neighbors = grid.getNeighbors(origin_cell);
			
			for (var i = 0; i < neighbors.length; i++ ) {
				if ( !neighbors[i].userData.smooothed_height ) {
					neighbors[i].userData.smooothed_height = true;
					var origin_height = origin_cell.h;
					var height = 0;
					var rand_distance = 0;
					switch ( method ) {
						case 'steep': 
							height = Math.floor( origin_height * ( Math.random() * 0.35 + 0.7 ) );
							rand_distance = Math.floor(Math.random() * 9) + 20;
							break;
						case 'flat': 
							height = Math.floor( origin_height * ( Math.random() * 0.2 + 0.85 ) );
							rand_distance = Math.floor(Math.random() * 9) + 20;
							break;
					}

					setHeight(neighbors[i], height );

					// Create a water spring
					if ( height > 100 && Math.random() > 0.95 ) {
						neighbors[i].userData.water_spring = true;
						setObjectType(neighbors[i], 'water');
					}

					if ( distance < rand_distance && height > 1 ) {
						smooth_height( neighbors[i], distance, method );
					}

				}
			}

			if (--terrain_is_generating == 0) {
				window.dispatchEvent(new CustomEvent('terrain_generated'));
			}
		});
	}

	function addSkyBox() {
		var geometry = new THREE.SphereGeometry(2000, 120, 80);  

		var material = new THREE.MeshPhongMaterial({
			color: '#8ACCFF'
		});

		skyBox = new THREE.Mesh(geometry, material);  
		skyBox.scale.set(-1, 1, 1);  
		skyBox.eulerOrder = 'XZY';  
		skyBox.renderDepth = 1000.0;  
		scene.add(skyBox);  
	}

	function generate_river_flow() {
		var water_springs = false;

		for ( cell_index in grid.cells ) {
			if ( grid.cells.hasOwnProperty(cell_index) ) {
				var cell = grid.cells[cell_index];
				if ( cell.userData.water_spring ) {
					water_springs = true;
					flow_water_cell( cell );
				}
			}
		}

		if ( ! water_springs ) {
			window.dispatchEvent(new CustomEvent('rivers_generated'));
		}
	}

	function flow_water_cell( cell ) {
		rivers_are_generating++;
		requestAnimationFrame( function() {


			cell.userData.flowing = true;
			var neighbors = grid.getNeighbors(cell);
			var min_height = 1000;
			var min_height_i = false;

			neighbors.sort(function(a, b) { 
			    return a.h - b.h;
			});

			var i = 0;
			while ( neighbors[i] && neighbors[i].userData.type === 'water' ) {
				i++;
			}

			if ( neighbors[i] && i < 2 ) {
				setObjectType(neighbors[i], 'water');
				flow_water_cell(neighbors[i]);
			}

			if (--rivers_are_generating == 0) {
				window.dispatchEvent(new CustomEvent('rivers_generated'));
			}
		});
	}

	function generate_cover_tile( cell_index ) {
		var cell = grid.cells[cell_index];
		if ( cell.userData.type == 'mountain' ) {

			if ( cell.h > min_snow_height ) {
				create_cover_tile({
						'x' : cell.tile.position.x,
						'y' : cell.h,
						'z' : cell.tile.position.z
					}, {
						'x' : 1,
						'y' : 1,
						'z' : 1
					}, 'snow');
			}
			else if ( cell.h < 50 ) {
				create_cover_tile( {
					'x' : cell.tile.position.x,
					'y' : cell.h,
					'z' : cell.tile.position.z
				}, {
					'x' : 1,
					'y' : 1,
					'z' : 1
				}, 'grass');
			}
		}

		if (--cover_tiles_are_generating == 0) {
			window.dispatchEvent(new CustomEvent('generation_complete'));
		}
	}

	function create_cover_tile( position, scale, type ) {
		createNewTile ({
			'position': {
				'x': position.x,
				'y': position.y,
				'z': position.z
			},
			'scale': {
				'x': scale.x,
				'y': scale.y,
				'z': scale.z
			},
			'height' : 1,
			'type' : type
		});		
	}

	function batch_generate( generate_function, mode ) {
		var buffer = [];
		var buffer_size = 1000;
		var i = 0;
		for ( cell_index in grid.cells ) {
			if ( grid.cells.hasOwnProperty(cell_index) ) {
				
				if ( mode == 'trees' ) {
					trees_are_generating++;
				}
				else if ( mode == 'covers' ) {
					cover_tiles_are_generating++;
				}

				i++;
				buffer.push(cell_index);
				if ( buffer.length == buffer_size || i == grid.numCells ) {
					( function( buffer ){
						requestAnimationFrame( function() {
							for ( index in buffer ) {
								if( buffer.hasOwnProperty(index) ) {
									generate_function( buffer[index] );
								}
							}
						});
					} )( buffer );

					buffer = [];
				}
			}
		}
	}

	function generate_tree( cell_index ) {
		var cell = grid.cells[cell_index];
		if ( cell.userData.type == 'grass' || cell.userData.type == 'mountain' ) {
			var rand = Math.floor( Math.random() * 100 );

			var tree_chance = cell.userData.type == 'grass' ? 80 : 95;

			if ( rand > tree_chance ) {
				var y_pos = cell.h;
				var height = Math.floor( Math.random() * 5 + 10 );

				createNewTile ({
					'position': {
						'x': cell.tile.position.x,
						'y': y_pos,
						'z': cell.tile.position.z
					},
					'scale': {
						'x': 0.2,
						'y': 0.2,
						'z': 1
					},
					'height' : height,
					'type' : 'tree-trunk'
				});

				y_pos += height;
				var height = Math.floor( Math.random() * 5 + 10 );

				createNewTile ({
					'position': {
						'x': cell.tile.position.x,
						'y': y_pos,
						'z': cell.tile.position.z
					},
					'scale': {
						'x': 1,
						'y': 1,
						'z': 1
					},
					'height' : height,
					'type' : 'leaves'
				});

				if ( y_pos > min_snow_height ) {
					create_cover_tile({
						'x' : cell.tile.position.x,
						'y' : y_pos + height,
						'z' : cell.tile.position.z
					}, {
						'x' : 1,
						'y' : 1,
						'z' : 1
					}, 'snow');
				}

				y_pos += height;
				var height = Math.floor( Math.random() * 5 + 10 );

				createNewTile ({
					'position': {
						'x': cell.tile.position.x,
						'y': y_pos,
						'z': cell.tile.position.z
					},
					'scale': {
						'x': 0.5,
						'y': 0.5,
						'z': 1
					},
					'height' : height,
					'type' : 'leaves'
				});

				if ( y_pos > min_snow_height ) {
					create_cover_tile({
						'x' : cell.tile.position.x,
						'y' : y_pos + height,
						'z' : cell.tile.position.z
					}, {
						'x': 0.5,
						'y': 0.5,
						'z' : 1
					}, 'snow');
				}
			}
		}

		if (--trees_are_generating == 0) {
			window.dispatchEvent(new CustomEvent('trees_generated'));
		}
	}

	function createNewTile( args ) {
		var settings = {
			tileScale: tileScale,
			cellSize: grid.cellSize,
			material: null,
			extrudeSettings: {
				amount: args.height || 1,
				bevelEnabled: true,
				bevelSegments: 1,
				steps: 1,
				bevelSize: 0.5,
				bevelThickness: 0.5
			}
		}

		var geometry = new THREE.ExtrudeGeometry(grid.cellShape, settings.extrudeSettings);

		var material = new THREE.MeshPhongMaterial({
			color: vg.Tools.randomizeRGB('30, 30, 30', 13)
		});

		var tile = new THREE.Mesh( geometry, material );

		if( args.type) {
			setTileColor( tile, args.type );
		}
		
		if ( args.position ) {
			tile.position.x = args.position.x;
			tile.position.y = args.position.y;
			tile.position.z = args.position.z;
		}		
		if ( args.scale ) {
			tile.scale.x = args.scale.x;
			tile.scale.y = args.scale.y;
			tile.scale.z = args.scale.z;
		}

		tile.rotation.x = -90 * vg.DEG_TO_RAD;
		meshes_to_combine.push(tile);
	}

	function setHeight(cell, height) {
		var settings = {
			tileScale: tileScale,
			cellSize: grid.cellSize,
			material: null,
			extrudeSettings: {
				amount: height,
				bevelEnabled: true,
				bevelSegments: 1,
				steps: 1,
				bevelSize: 0.5,
				bevelThickness: 0.5
			}
		}

		cell.h = height;		

		var tile = grid.generateTile(cell, settings.tileScale, settings.material);
		tile.position.copy(grid.cellToPixel(cell));
		tile.position.y = 0;

		board.tiles.push(tile);
		board.tileGroup.add(tile.mesh);

		if (height > 20) {
			setObjectType(cell, 'mountain');
		}
		else if(height > 2) {
			setObjectType(cell, 'grass');
		}
		else {
			setObjectType(cell, 'mud');
		}
	}

	function setObjectType(cell, cellType) {
		cell.userData.type = cellType;
		setTileColor(cell.tile, cellType);
	}

	function setTileColor(tile, type) {
		tile.material.color.r = objectTypes[type].r;
		tile.material.color.g = objectTypes[type].g;
		tile.material.color.b = objectTypes[type].b;
		tile.userData.type = type;
	}

	function mergeMeshes (meshArr) {
	    var geometry = new THREE.Geometry();

	    var material = meshArr[0].material;

	    for (var i = 0; i < meshArr.length; i++) {
	    	meshArr[i].updateMatrix();
	        geometry.merge(meshArr[i].geometry, meshArr[i].matrix);
	    }

	    if (--merging == 0) {
	    	window.dispatchEvent(new CustomEvent('merging_complete'));
	    }

	    return new THREE.Mesh(geometry, material);
	};	

	// TODO: find a way to optimize the merge process
	function mergeGeometries() {
		var geometry;

		merge_buffer_size = 2000;
		
		var material_meshes = [];
		for ( var object_type in objectTypes ) {
			if ( objectTypes.hasOwnProperty(object_type) ) {
				material_meshes[object_type] = [[]];
			}
		}

		for ( cell_index in grid.cells ) {
			if( grid.cells.hasOwnProperty(cell_index) ) {
				var cell = grid.cells[cell_index]; 
				cell.tile.mesh.userData.type = cell.tile.userData.type;
				meshes_to_combine.push(cell.tile.mesh);
			}
		}
		
		for ( var mesh_index in meshes_to_combine ) {
			if ( meshes_to_combine.hasOwnProperty(mesh_index) ) {
				var mesh = meshes_to_combine[mesh_index];
				if ( mesh.userData.type && material_meshes[mesh.userData.type] ) {
					var buffer_index = material_meshes[mesh.userData.type].length - 1;
					if ( material_meshes[mesh.userData.type][buffer_index].length == merge_buffer_size ) {
						material_meshes[mesh.userData.type].push([]);
					}

					material_meshes[mesh.userData.type][buffer_index].push(mesh);
				}
			}
		}

		for ( var mesh_type in material_meshes ) {
			if ( material_meshes.hasOwnProperty(mesh_type) ) {
				for ( var buffer_index = 0; buffer_index < material_meshes[mesh_type].length; buffer_index++ ) {
					merging++;
					(function ( mesh_arr ){
						requestAnimationFrame( function() {
							var object = mergeMeshes( mesh_arr );
							scene.add(object);
							console.log('merging geometry');
						})
					})( material_meshes[mesh_type][buffer_index] );
				}
			}
		}

		// Not sure if the tiles need to be deleted
		// for ( cell_index in grid.cells ) {
		// 	if( grid.cells.hasOwnProperty(cell_index) ) {
		// 		var cell = grid.cells[cell_index]; 
		// 		cell.tile.dispose();
		// 	}
		// }


	}

	function getRandomSeed() {
		var seed = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 20; i++ ) {
			seed += possible.charAt(Math.floor(Math.random() * possible.length));
		}

		return seed;
	}

	function NPC() {
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

		this.move = function() {
			var current_cell = grid.cells[this.coordinates.q + '.' + this.coordinates.r + '.' + this.coordinates.s];
			var neighbors = grid.getNeighbors(current_cell);

			var random_index = Math.floor(Math.random() * (neighbors.length) );
			var random_neighbor = neighbors[ random_index ];

			this.setPosition(random_neighbor);
		}

		var geometry = new THREE.SphereGeometry(8, 10, 10);  
		var material = new THREE.MeshPhongMaterial({
			color: '#cecece'
		});

		this.mesh = new THREE.Mesh(geometry, material);  
		this.mesh.position.x = 100;
		this.mesh.position.y = 100;

		return this;
	}

	function addNPC() {
		var npc = new NPC();
		
		npc.setPosition(grid.cells['0.0.0']);

		setInterval( function(){
			npc.move()
		}, 200 );

		scene.add(npc.mesh);  
	}


	init();

	return this;
}