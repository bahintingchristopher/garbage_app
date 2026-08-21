const asyncHandler = require("../../utils/asyncHandler");
const chatService = require("./chat.service");
const { getIO } = require("./socket");

function formatMessage(m) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    message: m.message,
    sender: m.sender
      ? { id: m.sender.id, name: m.sender.name, role: m.sender.role }
      : { id: m.senderId },
    createdAt: m.createdAt,
  };
}

exports.startConversation = asyncHandler(async (req, res) => {
  const conversationId = await chatService.findOrCreate(
    req.user,
    req.body.recipientId
  );
  res.status(201).json({
    success: true,
    message: "Conversation ready",
    data: { conversationId },
  });
});

exports.listConversations = asyncHandler(async (req, res) => {
  const rows = await chatService.listForUser(req.user.id);
  res.json({ success: true, data: rows });
});

exports.getMessages = asyncHandler(async (req, res) => {
  const rows = await chatService.getMessages(
    req.params.id,
    req.user.id
  );
  res.json({ success: true, data: rows.map(formatMessage) });
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const msg = await chatService.addMessage(
    req.params.id,
    req.user.id,
    req.body.message
  );
  const payload = formatMessage(msg);
  // Deliver in real time to everyone in the conversation room.
  const io = getIO();
  if (io) io.to("conv:" + msg.conversationId).emit("new_message", payload);

  res.status(201).json({ success: true, data: payload });
});
