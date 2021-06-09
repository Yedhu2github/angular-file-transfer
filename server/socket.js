const { Server } = require("socket.io");
module.exports.listener = function (server) {
  const users = {};
  var io = new Server(server);
  const socketToRoom = {};
  io.on("connection", (socket) => {
    console.log(socket.id, "<== socket id updated");

    socket.on("join room", (socketID) => {
      console.log(socketID);
      io.to(socket.id).emit("all file receivers", [socketID]);
    });

    socket.on("sending signal", (payload) => {
      console.log(payload);
      io.to(payload.userToSignal).emit("user joined", {
        signal: payload.signal,
        callerID: payload.callerID,
        file: payload.file,
        sender: socket.id,
      });
    });

    socket.on("returning signal", (payload) => {
      io.to(payload.callerID).emit("receiving returned signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    socket.on("disconnect", () => {
      const roomID = socketToRoom[socket.id];
      let room = users[roomID];
      if (room) {
        room = room.filter((id) => id !== socket.id);
        users[roomID] = room;
        socket.broadcast.emit("user left", socket.id);
      }
    });
  });
};
