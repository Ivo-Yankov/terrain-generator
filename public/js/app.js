$(function(){
	var socket = io();

	socket.on('chat message', function(data) {
		console.log(data);
		$('#chat').append('<div><span class="name">' + data.sender + ': </span>' + data.msg + '</div>');
	});

	$('#new_chat_message').on('keydown', function(e) {
		if (e.keyCode == 13) {
			socket.emit('chat message', $(this).val());
			$(this).val('');
			return false;
		}
	});
})