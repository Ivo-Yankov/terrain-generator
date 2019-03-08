function EntityCollection( args ) {
	args = args || {};
	this.entities = {};
}

EntityCollection.prototype = {
	addEntity: function(args) {
		args = args || {};
		args.cell = args.position || {s: 0, r: 0, q: 0};

		var entity = new Entity(args);
		this.entities[entity.id] = entity;

		if (args.type === 'player' && args.controllable) {
			window.addEventListener('click', entity.move_player.bind(entity));
		}
	},

	spawnResources: function(type, chance, spawn_restrictions) {
		grid.traverse(function(cell) {
			var roll = Math.random() * 100;
			if ( roll <= chance ) {
				new Entity({
					color: '#ffffff',
					cell: cell,
					controllable: false
				});
			}
		});
	},

	getEntity: function(id) {
		for( i in this.entities ) {
			if (this.entities[i].id === id) {
				return this.entities[i];
			}
		}

		return false;
	},

	refreshEntities: function(entities) {
		for ( var i in entities ) {
			if ( entities.hasOwnProperty(i) ) {
				if ( this.getEntity(i) ) {
					this.getEntity(i).update(entities[i]);
				}
				else {
					this.addEntity(entities[i]);
				}
			}
		}
	}
};

EntityCollection.prototype.constructor = EntityCollection;