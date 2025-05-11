const { io } = require("socket.io-client");
const socket = io("ws://localhost:8002");

socket.on("connect", () => {
  console.log("Conectado! ID:", socket.id);
});