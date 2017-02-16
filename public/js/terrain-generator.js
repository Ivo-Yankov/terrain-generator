TerrainGenerator = function(args) {
	min_snow_height = 150;

	// Define global variables
	var meshes_to_combine = [];

	var size = args.size || 40;

	var tileScale = 0.95;

	var merging = 0;
	merged_group = new THREE.Object3D();

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
		window.addEventListener('merging_complete', function(evt) {
			console.log('merging_complete');
			scene.add( merged_group );
		});

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

		board = new vg.Board(grid, {
			heuristicFilter: function(origin, next) {
				return true;
				if (next.h - origin.h > 10) {
					return false; // no, filter out next
				}
				return true; // yes, keep next for consideration
			}
		});

		board.generateTilemap({
			tileScale: tileScale
		});
		
		addSkyBox();

		load_terrain();
		
		update();
	};

	function update() {
		scene.render();
		requestAnimationFrame(update);
	}

	function load_terrain(){

		var xmlhttp = new XMLHttpRequest();

		xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == XMLHttpRequest.DONE ) {
				if (xmlhttp.status == 200) {
					data = JSON.parse(xmlhttp.responseText);
					console.log(data); 
					render_terrain(data);
				}
				else {
					console.log("error: status", xmlhttp.status);
					console.log(xmlhttp.responseText);
				}
			}
		};

		xmlhttp.open("GET", "/generate-map", true);
		xmlhttp.send();
	}

	function render_terrain(data) {
		for (var i in data ) {
			if( data.hasOwnProperty(i) ) {
				var cell = getCell(data[i].q, data[i].r, data[i].s);

				setHeight(cell, data[i].h);

				setObjectType(cell, data[i].type);

				setFeatures(cell, data[i].features);
			}
		}

		mergeGeometries();
	}

	function getCell(q, r, s) {
		return board.grid.cells[ q + '.' + r + '.' + s ];
	}

	function setFeatures(cell, features) {
		for (var feature in features) {
			if ( features.hasOwnProperty(feature) ) {
				if ( features[feature] ) {
					createFeatureGeometry( cell, feature, features[feature] );
				}
			}
		}
	}

	function createFeatureGeometry( cell, feature, args ) {
		switch (feature) {
			case 'tree':
				createTreeGeometry(cell, args);
				break;

			case 'grass':
				createGrassGeometry(cell, args);
				break;

			case 'snow':
				createSnowGeometry(cell, args);
				break;
		}
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

	function createGrassGeometry(cell, args) {
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

	function createSnowGeometry(cell, args) {
		create_cover_tile( {
			'x' : cell.tile.position.x,
			'y' : cell.h,
			'z' : cell.tile.position.z
		}, {
			'x' : 1,
			'y' : 1,
			'z' : 1
		}, 'snow');
	}

	function createTreeGeometry(cell, args) {
		var y_pos = cell.h;

		var height_1 = args.height_1 || Math.floor( Math.random() * 5 + 10 );
		var height_2 = args.height_2 || Math.floor( Math.random() * 5 + 10 );
		var height_3 = args.height_3 || Math.floor( Math.random() * 5 + 10 );

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
			'height' : height_1,
			'type' : 'tree-trunk'
		});

		y_pos += height_1;
		
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
			'height' : height_2,
			'type' : 'leaves'
		});

		if ( y_pos > min_snow_height ) {
			create_cover_tile({
				'x' : cell.tile.position.x,
				'y' : y_pos + height_2,
				'z' : cell.tile.position.z
			}, {
				'x' : 1,
				'y' : 1,
				'z' : 1
			}, 'snow');
		}

		y_pos += height_2;
		
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
			'height' : height_3,
			'type' : 'leaves'
		});

		if ( y_pos > min_snow_height ) {
			create_cover_tile({
				'x' : cell.tile.position.x,
				'y' : y_pos + height_3,
				'z' : cell.tile.position.z
			}, {
				'x': 0.5,
				'y': 0.5,
				'z' : 1
			}, 'snow');
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
					if ( material_meshes[mesh_type][buffer_index] && material_meshes[mesh_type][buffer_index].length ) {
						merging++;
						(function ( mesh_arr ){
							requestAnimationFrame( function() {
								var object = mergeMeshes( mesh_arr );
								merged_group.add( object );
								console.log('merging geometry');
								
								if (--merging == 0) {
									window.dispatchEvent(new CustomEvent('merging_complete'));
								}
							})
						})( material_meshes[mesh_type][buffer_index] );
					}
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

	init();

	return this;
}