const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../../config/environment");
const userService = require("../users/user.service");
const chatService = require("./chat.service");

let io = null;

function initSocket(server) {
  io = new Server(server, { cors: { origin: "*" } });

  // JWT auth on the socket handshake
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication required"));
      const payload = jwt.verify(token, jwtConfig.secret);
      const user = await userService.findActiveById(payload.id);
      if (!user) return next(new Error("Account not found or deactivated"));
      socket.user = user;
      next();
    } catch (_) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = Number(socket.user.id);
    socket.join("user:" + userId);

    // Auto-join every conversation this user belongs to
    try {
      const ids = await chatService.listConversationIds(userId);
      ids.forEach((id) => socket.join("conv:" + id));
    } catch (_) {
      /* non-fatal */
    }

    socket.on("join_conversation", async (payload, ack) => {
      try {
        await chatService.assertParticipant(payload.conversationId, userId);
        socket.join("conv:" + payload.conversationId);
        if (typeof ack === "function") ack({ success: true });
      } catch (err) {
        if (typeof ack === "function") ack({ success: false, message: err.message });
      }
    });

    socket.on("send_message", async (payload, ack) => {
      try {
        const msg = await chatService.addMessage(
          payload.conversationId,
          userId,
          payload.message
        );
        const data = {
          id: msg.id,
          conversationId: msg.conversationId,
          message: msg.message,
          sender: {
            id: Number(msg.sender.id),
            name: msg.sender.name,
            role: msg.sender.role,
          },
          createdAt: msg.createdAt,
        };
        io.to("conv:" + payload.conversationId).emit("new_message", data);
        if (typeof ack === "function") ack({ success: true, data });
      } catch (err) {
        if (typeof ack === "function") ack({ success: false, message: err.message });
      }
    });

    socket.on("disconnect", () => {});
  });

  console.log("[socket] Socket.IO ready for real-time chat");
  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
