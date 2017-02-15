var Cell = require('./ServerCell.js');
var Grid = require('./ServerHexGrid.js');
var seedrandom = require('seedrandom');

var Generator = function ( args ) {
	min_snow_height = 150;

	var grid = args.grid;

	// Create a random seed of none is provided
	seed = args.seed || getRandomSeed();
	Math.seedrandom(seed);
	console.log( 'Generating terrain with seed: ' + seed );

	terrain_is_generating = 0;
	rivers_are_generating = 0;
	trees_are_generating = 0;
	cover_tiles_are_generating = 0;

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
					
					cell.h = height_value;
					smooth_height( cell, 0, 'steep' );
				}

				// Generate a flat land island
				else if ( height_rand_seed >= 99.90 ) {
					height_value = Math.floor( Math.random() * 15 + 10 );
					cell.h = height_value;
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

					neighbors[i].h = height

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
				generate_river_flow();
			}
		});
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
			batch_generate( generate_tree, 'trees' );
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
				neighbors[i].userData.type = 'water';
				flow_water_cell(neighbors[i]);
			}

			if (--rivers_are_generating == 0) {
				batch_generate( generate_tree, 'trees' );
			}
		});
	}

	function generate_cover_tile( cell_index ) {
		var cell = grid.cells[cell_index];
		if ( cell.userData.type == 'mountain' ) {

			if ( cell.h > min_snow_height ) {
				createSnowGeometry(cell);
				add_feature(cell, 'snow');
			}
			else if ( cell.h < 50 ) {
				createGrassGeometry(cell);
				add_feature(cell, 'grass');
			}
		}

		if (--cover_tiles_are_generating == 0) {
			getJSON();
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
				createTreeGeometry(cell);
			}
		}

		if (--trees_are_generating == 0) {
			window.dispatchEvent(new CustomEvent('trees_generated'));
			batch_generate( generate_cover_tile, 'covers' );
		}
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

		console.log(data);

		// var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
		// $('#downloadAnchorElem').remove();
		// $(document).appent($('<a id="downloadAnchorElem" style="display:none"></a>'));
		// var dlAnchorElem = document.getElementById('downloadAnchorElem');
		// dlAnchorElem.setAttribute("href",     dataStr     );
		// dlAnchorElem.setAttribute("download", "scene.json");
		// dlAnchorElem.click();
	}

}

module.exports = Generator;