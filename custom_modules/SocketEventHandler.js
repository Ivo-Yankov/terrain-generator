const events = require('events');
const GameServer = require('./GameServer.js');

SocketEventHandler = function (args) {

    let io = args.io;
    let app = args.app;
    let eventEmitter = args.eventEmitter;

    const refreshMapList = () => {
        io.emit('refresh map list', Object.keys(app.game_servers));
    };

    const getPlayerSocket = (player_id) => {
        return io.sockets.connected[player_id];
    };

    const getSocketsByServer = (server_id) => {
        let sockets = [];
        for (let i in io.sockets.connected) {
            if (io.sockets.connected.hasOwnProperty(i) && io.sockets.connected[i].server_id === server_id) {
                sockets.push(io.sockets.connected[i]);
            }
        }
        return sockets;
    };

    eventEmitter.on('map generated', (data) => {
        console.log('map generated');
        // data = {
        // 	server_id,
        // 	socket_ids,
        // 	map_data,
        // 	entities,
        // }

        // Send all to client
        for (let i in data.socket_ids) {
            if (data.socket_ids.hasOwnProperty(i)) {
                let socket = getPlayerSocket(data.socket_ids[i]);
                socket.emit('load map data', data);
            }
        }

        // Update clients with map list
        refreshMapList();
    });

    io.on('connection', (socket) => {
        console.log('a user has connected');

        refreshMapList();

        socket.on('chat message', (data) => {
            io.emit('chat message', {
                msg: data.msg,
                sender: data.name || socket.id
            });
        });

        socket.on('disconnect', () => {
            console.log('a user has disconnected');

            // If the client is connected to a host
            if (socket.server_id) {

                // Remove player from server
                let server = app.game_servers[socket.server_id];
                if (server) {
                    for (let conn in server.connections) {
                        if (server.connections[conn] === socket.id) {
                            server.connections.splice(conn, 1);
                        }
                    }

                    // Remove server if empty
                    if (app.game_servers[socket.server_id].connections.length === 0) {
                        console.log('deleting server');
                        delete app.game_servers[socket.server_id];
                    } else {
                        // Update clients with entities
                        for (let conn in server.connections) {
                            getPlayerSocket(server.connections[conn]).emit('update entities', server.getEntitiesData(server.connections[conn]));
                        }
                    }
                }

                // Update clients with map list
                refreshMapList();
            }


        });

        socket.on('create server', (data) => {
            // Mark this socket as a host
            socket.server_id = socket.id;

            // Init the server
            app.game_servers[socket.id] = new GameServer({
                eventEmitter: eventEmitter,
                server_id: socket.id,
                seed: data.seed,
                size: data.size,
                players: [socket.id]
            });
        });

        socket.on('join server', (server_id) => {
            // data = {
            // 	server_id: self.server_id,
            // 	socket_ids: args.players,
            // 	map_data: map_data,
            // 	entities: self.entities
            // }

            if (app.game_servers[server_id]) {

                // Mark this socket as connected to the host
                socket.server_id = server_id;


                // Create entities
                app.game_servers[server_id].addPlayer({
                    connection_id: socket.id
                });

                // Send entities to clients
                let sockets = getSocketsByServer(server_id);
                for (let i = 0; i < sockets.length; i++) {
                    let entities_data = app.game_servers[server_id].getEntitiesData(sockets[i].id);
                    let emit_data = {
                        entities: entities_data,
                        server_id: server_id
                    };

                    if (socket.id === sockets[i].id) {
                        emit_data.map_data = app.game_servers[server_id].map_data;
                        sockets[i].emit('load map data', emit_data);
                    } else {
                        sockets[i].emit('player joined', emit_data);
                    }
                }
            }
        });

        socket.on('entity action', (data) => {
            // data: {
            // 	server_id,
            // 	entities: {[
            // 		id,
            // 		position: { q, r, s } || path
            // 	]}
            // }

            // Update entities
            if (app.game_servers[socket.server_id]) {
                for (let i in data.entities) {
                    if (data.entities.hasOwnProperty(i)) {
                        app.game_servers[data.server_id].entities[data.entities[i].id].update(data.entities[i]);
                    }
                }
            }

            // Send entities to clients
            let sockets = getSocketsByServer(data.server_id);

            for (let i = 0; i < sockets.length; i++) {
                let entities_data = app.game_servers[data.server_id].getEntitiesData(sockets[i].id);

                sockets[i].emit('update entities', entities_data);
            }

            // Flush entities data
            if (app.game_servers[socket.server_id]) {
                for (let i in data.entities) {
                    if (data.entities.hasOwnProperty(i)) {
                        app.game_servers[data.server_id].entities[data.entities[i].id].flushActions();
                    }
                }
            }
        });
    });
};

module.exports = SocketEventHandler;