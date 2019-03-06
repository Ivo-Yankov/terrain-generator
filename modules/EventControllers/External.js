const {refreshMapList, getPlayerSocket, getSocketsByServer} = require('../../helpers/SocketHelpers');

function receiveChatMessage(data) {
    io.emit('chat message', {
        msg: data.msg,
        sender: data.name || this.id
    });
}

function closeUserConnection() {
    console.log('a user has disconnected');

    // If the client is connected to a host
    if (this.server_id) {

        // Remove player from server
        let server = app.game_servers[this.server_id];
        if (server) {
            for (let conn in server.connections) {
                if (server.connections[conn] === this.id) {
                    server.connections.splice(conn, 1);
                }
            }

            // Remove server if empty
            if (app.game_servers[this.server_id].connections.length === 0) {
                console.log('deleting server');
                delete app.game_servers[this.server_id];
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
}

function receiveNewServerRequest(eventEmitter, data) {
    // Mark this socket as a host
    this.server_id = this.id;

    // Init the server
    app.game_servers[this.id] = new GameServer({
        eventEmitter: eventEmitter,
        server_id: this.id,
        seed: data.seed,
        size: data.size,
        players: [this.id]
    });
}


function receiveJoinServerRequest(server_id) {
    // data = {
    // 	server_id: self.server_id,
    // 	socket_ids: args.players,
    // 	map_data: map_data,
    // 	entities: self.entities
    // }

    if (app.game_servers[server_id]) {

        // Mark this socket as connected to the host
        this.server_id = server_id;


        // Create entities
        app.game_servers[server_id].addPlayer({
            connection_id: this.id
        });

        // Send entities to clients
        let sockets = getSocketsByServer(server_id);
        for (let i = 0; i < sockets.length; i++) {
            let entities_data = app.game_servers[server_id].getEntitiesData(sockets[i].id);
            let emit_data = {
                entities: entities_data,
                server_id: server_id
            };

            if (this.id === sockets[i].id) {
                emit_data.map_data = app.game_servers[server_id].map_data;
                sockets[i].emit('load map data', emit_data);
            } else {
                sockets[i].emit('player joined', emit_data);
            }
        }
    }
}

function receiveEntityAction(data) {
    // data: {
    // 	server_id,
    // 	entities: {[
    // 		id,
    // 		position: { q, r, s } || path
    // 	]}
    // }

    // Update entities
    if (app.game_servers[this.server_id]) {
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
    if (app.game_servers[this.server_id]) {
        for (let i in data.entities) {
            if (data.entities.hasOwnProperty(i)) {
                app.game_servers[data.server_id].entities[data.entities[i].id].flushActions();
            }
        }
    }
}

module.exports = {
    receiveChatMessage,
    closeUserConnection,
    receiveNewServerRequest,
    receiveJoinServerRequest,
    receiveEntityAction
};