const { Op } = require("sequelize");
const sequelize = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const {
  Conversation,
  ConversationParticipant,
  Message,
} = require("./chat.model");

/// Who may open a conversation with whom.
const ALLOWED_PAIRS = {
  CLIENT: ["COLLECTOR", "ADMIN"],
  COLLECTOR: ["CLIENT", "COLLECTOR", "ADMIN"],
  ADMIN: ["CLIENT", "COLLECTOR", "ADMIN"],
};

async function assertParticipant(conversationId, userId) {
  const row = await ConversationParticipant.findOne({
    where: { conversationId, userId },
  });
  if (!row) throw new ApiError(403, "You are not part of this conversation");
  return row;
}

/// Finds the 1-on-1 conversation between two users or creates it.
async function findOrCreate(sender, recipientId) {
  const recipientIdNum = Number(recipientId);
  if (!recipientIdNum || Number(sender.id) === recipientIdNum) {
    throw new ApiError(400, "recipientId must be another user");
  }

  const recipient = await require("../users/user.model").User.findByPk(
    recipientIdNum
  );
  if (!recipient) throw new ApiError(404, "Recipient not found");
  if (!recipient.isActive) throw new ApiError(400, "Recipient account is deactivated");

  const allowed = ALLOWED_PAIRS[sender.role] || [];
  if (!allowed.includes(recipient.role)) {
    throw new ApiError(
      403,
      `A ${sender.role.toLowerCase()} cannot message a ${recipient.role.toLowerCase()}`
    );
  }

  const mine = await ConversationParticipant.findAll({
    where: { userId: sender.id },
    attributes: ["conversationId"],
    raw: true,
  });

  if (mine.length > 0) {
    const shared = await ConversationParticipant.findOne({
      where: {
        conversationId: { [Op.in]: mine.map((r) => r.conversationId) },
        userId: recipientIdNum,
      },
    });
    if (shared) return Number(shared.conversationId);
  }

  return sequelize.transaction(async (t) => {
    const conversation = await Conversation.create({}, { transaction: t });
    await ConversationParticipant.bulkCreate(
      [
        { conversationId: conversation.id, userId: sender.id },
        { conversationId: conversation.id, userId: recipientIdNum },
      ],
      { transaction: t }
    );
    return Number(conversation.id);
  });
}

function formatConversation(conv, viewerId, unreadCount = 0) {
  const others = (conv.participants || []).filter(
    (p) => Number(p.userId) !== Number(viewerId)
  );
  const last = conv.messages && conv.messages.length > 0 ? conv.messages[0] : null;
  return {
    id: conv.id,
    participants: others.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      role: p.user.role,
    })),
    unreadCount,
    lastMessage: last
      ? { message: last.message, senderId: last.senderId, createdAt: last.createdAt }
      : null,
    createdAt: conv.createdAt,
  };
}

async function listForUser(userId) {
  const conversations = await Conversation.findAll({
    include: [
      {
        model: ConversationParticipant,
        as: "participants",
        required: true,
        include: [{ model: require("../users/user.model").User, as: "user", attributes: ["id", "name", "role"] }],
      },
      { model: Message, as: "messages", separate: true, limit: 1, order: [["createdAt", "DESC"]] },
    ],
    order: [["createdAt", "DESC"]],
    limit: 100,
  });

  const mine = conversations.filter((c) =>
    c.participants.some((p) => Number(p.userId) === Number(userId))
  );

  return Promise.all(
    mine.map(async (c) => {
      const me = c.participants.find(
        (p) => Number(p.userId) === Number(userId)
      );
      const since = me && me.lastReadAt ? me.lastReadAt : null;
      const unreadCount = await Message.count({
        where: {
          conversationId: c.id,
          senderId: { [Op.ne]: userId },
          ...(since ? { createdAt: { [Op.gt]: since } } : {}),
        },
      });
      return formatConversation(c, userId, unreadCount);
    })
  );
}

async function getMessages(conversationId, userId, limit = 200) {
  await assertParticipant(conversationId, userId);
  // Opening the thread marks it as read for this user.
  await ConversationParticipant.update(
    { lastReadAt: new Date() },
    { where: { conversationId, userId } }
  );
  return Message.findAll({
    where: { conversationId },
    include: [{ model: require("../users/user.model").User, as: "sender", attributes: ["id", "name", "role"] }],
    order: [["createdAt", "ASC"]],
    limit,
  });
}

async function addMessage(conversationId, senderId, text) {
  if (!text || !String(text).trim()) {
    throw new ApiError(400, "message is required");
  }
  await assertParticipant(conversationId, senderId);

  const msg = await Message.create({
    conversationId,
    senderId,
    message: String(text).trim().slice(0, 2000),
  });

  // Update the sender's own read marker so unread counts stay sane.
  await ConversationParticipant.update(
    { lastReadAt: new Date() },
    { where: { conversationId, userId: senderId } }
  );

  return Message.findByPk(msg.id, {
    include: [{ model: require("../users/user.model").User, as: "sender", attributes: ["id", "name", "role"] }],
  });
}

async function listConversationIds(userId) {
  const rows = await ConversationParticipant.findAll({
    where: { userId },
    attributes: ["conversationId"],
    raw: true,
  });
  return rows.map((r) => r.conversationId);
}

module.exports = {
  findOrCreate,
  listForUser,
  getMessages,
  addMessage,
  assertParticipant,
  listConversationIds,
};



