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

	$("#current-maps").on('click', 'li', function() {
		socket.emit('get map', $(this).attr('data-map'));
	})

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
});