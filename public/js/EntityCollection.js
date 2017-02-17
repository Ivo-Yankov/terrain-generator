function EntityCollection( args ) {
	args = args || {};
	entities = args.entities || [];

	return this;
}

EntityCollection.prototype = {
	addPlayer: function(args) {
		args = args || {};
		args.cell = grid.cells['0.0.0'];
		args.controllable = true;

		var entity = new Entity(args);

		window.player = entity;
		entities[entity.id] = entity;
		window.addEventListener('click', entity.move_player.bind(entity));
	},

	spawnResources: function(type, chance, spawn_restrictions) {
		grid.traverse(function(cell) {
			var roll = Math.random() * 100;
			if ( roll <= chance ) {
				new Entity( {
					color: '#ffffff',
					cell: cell,
					controllable: false
				} );
			}
		});
	}
}

EntityCollection.prototype.constructor = EntityCollection;

entityCollection = new EntityCollection();