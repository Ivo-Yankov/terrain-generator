$(function(){
	window.socket = io();

	socket.on('chat message', function(data) {
		$('#chat').append('<div><span class="name">' + data.sender + ': </span>' + data.msg + '</div>');
	});

	socket.on('load map', function(data) {
		load_map(data);
	});
	
	socket.on('terrain generated', function(data) {
		load_map(data);
	});

	socket.on('refresh map list', function(data) {
		var $ul = $("#current-maps");
		$ul.html("");
		for (var i in data) {
			$ul.append("<li data-map='" + data[i] + "'>" + data[i] + "</li>");
		}
	});

	socket.on('update entity', function(data) {
		console.log("update entity!", data);
		var entity = entityCollection.getEntity(data.id);
		if (entity) {
			entity.update(data);
		}
	});

	socket.on('load entities', function(entities) {
		for (var id in entities) {
			if (entities.hasOwnProperty(id)) {
				//TODO not all entities are players
				entityCollection.addPlayer(entities[id]);
			}
		}
	});

	$("#current-maps").on('click', 'li', function() {
		window.server_id = $(this).attr('data-map');
		socket.emit('get map', window.server_id);
	});

	$('#new_chat_message').on('keydown', function(e) {
		if (e.keyCode == 13) {
			socket.emit('chat message', {
				msg: $(this).val(),
				name: $('#chat_name').val()
			});
			$(this).val('');
			return false;
		}
	});

	window.addEventListener('merging_complete', function() {
		socket.emit('load entities', {server_id: window.server_id || false});

		socket.emit('player joined', {server_id: window.server_id || false});
	});
});