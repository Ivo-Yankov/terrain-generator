var Cell = require('./Cell.js');
var Grid = require('./HexGrid.js');
var seedrandom = require('seedrandom');

var events = require('events');

var Generator = function ( args ) {
	min_snow_height = 150;

	var grid = args.grid;
	var app = args.app;
	var io = args.io;
	var socket = args.socket;

	// Create a random seed of none is provided
	seed = args.seed || getRandomSeed();
	Math.seedrandom(seed);
	console.log( 'Generating terrain with seed: ' + seed );

	terrain_is_generating = 0;
	rivers_are_generating = 0;
	trees_are_generating = 0;
	cover_tiles_are_generating = 0;

	generate_terrain();

	// Create an eventEmitter object
	var eventEmitter = new events.EventEmitter(this);

	eventEmitter.on('terrain_generated', function(evt) {
		console.log('terrain_generated');
		// Starts the generation of the rivers after the terrain is completed
		generate_river_flow();
	});

	eventEmitter.on('rivers_generated', function(evt) {
		console.log('rivers_generated');
		// Creates trees on grass and mountain tiles
		batch_generate( generate_tree, 'trees' );

	});

	eventEmitter.on('trees_generated', function(evt) {
		console.log('trees_generated');
		// Adds snow to the higher mountains and grass to the lower mountains
		batch_generate( generate_cover_tile, 'covers' );
	});

	eventEmitter.on('generation_complete', function() {
		console.log('generation_complete');
		// Merges all geometries with the same materials into single objects
		// This greatly improves the performance
		var data = getGridData();

		var map_data = {
			seed: seed,
			size: grid.size,
			grid: data
		};

		app.current_maps[socket.id] = map_data;

		io.emit('refresh map list', Object.keys(app.current_maps));

		socket.emit('terrain generated', map_data);
	});

	function getRandomSeed() {
		var seed = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 20; i++ ) {
			seed += possible.charAt(Math.floor(Math.random() * possible.length));
		}

		return seed;
	}

	function generate_terrain() {
		// Set all cells to water
		for ( cell_index in grid.cells ) {
			if( grid.cells.hasOwnProperty(cell_index) ) {
				var cell = grid.cells[cell_index];
				cell.userData.type = 'water';
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
					
					setHeight(cell, height_value);
					smooth_height( cell, 0, 'steep' );
				}

				// Generate a flat land island
				else if ( height_rand_seed >= 99.90 ) {
					height_value = Math.floor( Math.random() * 15 + 10 );
					setHeight(cell, height_value);
					smooth_height( cell, 0, 'flat' );
				}
			}
		}
	}

	function smooth_height( origin_cell, distance, method ) {
		terrain_is_generating++;
		setImmediate( function() {
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

					setHeight(neighbors[i], height);

					// Create a water spring
					if ( height > 100 && Math.random() > 0.95 ) {
						neighbors[i].userData.water_spring = true;
						neighbors[i].userData.type = 'water';
					}

					if ( distance < rand_distance && height > 1 ) {
						smooth_height( neighbors[i], distance, method );
					}
				}
			}

			if (--terrain_is_generating == 0) {
				eventEmitter.emit('terrain_generated');
			}
		});
	}

	function setHeight(cell, height) {
		cell.h = height;
		if (!cell.userData) {
			cell.userData = {};
		}
		if (height > 20) {
			cell.userData.type = 'mountain';
		}
		else if(height > 2) {
			cell.userData.type = 'grass';
		}
		else {
			cell.userData.type = 'mud';
		}
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
			eventEmitter.emit('rivers_generated');
		}
	}

	function flow_water_cell( cell ) {
		rivers_are_generating++;
		setImmediate( function() {


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
				neighbors[i].userData.type = 'water';
				flow_water_cell(neighbors[i]);
			}

			if (--rivers_are_generating == 0) {
				eventEmitter.emit('rivers_generated');
			}
		});
	}

	function generate_cover_tile( cell_index ) {
		var cell = grid.cells[cell_index];
		if ( cell.userData.type == 'mountain' ) {

			if ( cell.h > min_snow_height ) {
				add_feature(cell, 'snow');
			}
			else if ( cell.h < 50 ) {
				add_feature(cell, 'grass');
			}
		}

		if (--cover_tiles_are_generating == 0) {
			eventEmitter.emit('generation_complete');
		}
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
						setImmediate( function() {
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

	function add_feature(cell, feature) {
		if (!cell.userData.features) {
			cell.userData.features = {};
		}

		cell.userData.features[feature] = true;
	}

	function generate_tree( cell_index ) {
		var cell = grid.cells[cell_index];
		if ( cell.userData.type == 'grass' || cell.userData.type == 'mountain' ) {
			var rand = Math.floor( Math.random() * 100 );

			var tree_chance = cell.userData.type == 'grass' ? 80 : 95;

			if ( rand > tree_chance ) {
				add_feature(cell, 'tree');
			}
		}

		if (--trees_are_generating == 0) {
			eventEmitter.emit('trees_generated');
		}
	}

	function getGridData() {
		var data = [];

		for(var cell_index in grid.cells) {
			var cell = grid.cells[cell_index];
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

		return data;
	}

	return this;
}


module.exports = Generator;