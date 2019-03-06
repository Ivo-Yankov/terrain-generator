const express = require('express');
const fs = require('fs');
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const EventHandler = require('./custom_modules/EventHandler.js');
const SocketHandler = require('./custom_modules/SocketEventHandler.js');
const PORT = process.env.PORT || 3000;

app.game_servers = {};
 
app.get('/', (req, res) => {
	fs.readFile('./public/index.html', 'utf8', function(err, text) {
		res.send(text);
	});
});

app.use(express.static('public'));

SocketHandler({
	io: io,
	app: app,
	eventEmitter: EventHandler() 
});
 
server.listen(PORT);