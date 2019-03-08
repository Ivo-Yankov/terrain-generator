$(function(){
	window.socket = io();
	window.entityCollection = new EntityCollection();

	// Chat messages
	socket.on('chat message', function(data) {
		var $chat = $('#chat');
		$chat.append('<div class="chat-message"><span class="name">' + data.sender + ': </span>' + data.msg + '</div>');
		$chat.scrollTop($chat[0].scrollHeight);
	});

	$('.chat-toggle-button').on('click', function(e) {
		$('.chat-container').toggleClass('active');
	});

	$('#new_chat_message').on('keydown', function(e) {
		if (e.keyCode === 13) {
			socket.emit('chat message', {
				msg: $(this).val(),
				name: $('#chat_name').val()
			});
			$(this).val('');
			return false;
		}
	});

	socket.on('load map data', function(data) {
		load_map(data);
	});

	//TODO This event is never emitted
	window.addEventListener('load entities', function(entities){

		//TODO this is not defined
		window.entityCollection.addEntities(entities);
	});
	
	socket.on('refresh map list', function(data) {
		var $ul = $("#current-maps");
		$ul.html("");
		for (var i in data) {
			$ul.append("<li data-map='" + data[i] + "'>" + data[i] + "</li>");
		}
	});

	//TODO handle multiple entities
	socket.on('update entities', function(entities) {
		for (var id in entities) {
			if (entities.hasOwnProperty(id)) {
				var entity = window.entityCollection.getEntity(id);
				if (entity) {
					entity.update(entities[id]);
				}
			}
		}
	});

	$("#current-maps").on('click', 'li', function() {
		window.server_id = $(this).attr('data-map');
		socket.emit('join server', window.server_id);
	});

	socket.on('player joined', function(data) { 
		window.entityCollection.refreshEntities(data.entities);
	});
});