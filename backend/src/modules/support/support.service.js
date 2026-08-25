const { Op } = require("sequelize");
const ApiError = require("../../utils/ApiError");
const { User } = require("../users/user.model");
const {
  SupportTicket,
  TicketMessage,
} = require("./support.model");
const sequelize = require("../../config/database");

async function create(userId, { subject, message }) {
  if (!subject || !message) {
    throw new ApiError(400, "subject and message are required");
  }

  return sequelize.transaction(async (t) => {
    const ticket = await SupportTicket.create(
      { userId, subject: String(subject).trim() },
      { transaction: t }
    );
    await TicketMessage.create(
      { ticketId: ticket.id, senderId: userId, message: String(message).trim() },
      { transaction: t }
    );
    return getFullById(ticket.id, { transaction: t });
  });
}


async function getFullById(id, opts = {}) {
  const ticket = await SupportTicket.findByPk(id, {
    ...opts,
    include: [
      {
        model: TicketMessage,
        as: "messages",
        include: [
          { model: User, as: "sender", attributes: ["id", "name", "role"] },
        ],
      },
      { model: User, as: "owner", attributes: ["id", "name", "role"] },
    ],
    order: [[{ model: TicketMessage, as: "messages" }, "createdAt", "ASC"]],
  });
  if (!ticket) throw new ApiError(404, "Ticket not found");
  return ticket;
}

function assertAccess(ticket, user) {
  const isOwner = Number(ticket.userId) === Number(user.id);
  if (!isOwner && user.role !== "ADMIN") {
    throw new ApiError(403, "You do not have access to this ticket");
  }
}

async function addMessage(ticketId, user, message) {
  if (!message || !String(message).trim()) {
    throw new ApiError(400, "message is required");
  }
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new ApiError(404, "Ticket not found");
  assertAccess(ticket, user);
  if (ticket.status === "RESOLVED") {
    throw new ApiError(400, "Ticket is already resolved");
  }

  await TicketMessage.create({
    ticketId,
    senderId: user.id,
    message: String(message).trim(),
  });
  return getFullById(ticketId);
}

async function listMine(userId) {
  return SupportTicket.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
  });
}

async function adminList(status) {
  const where = status ? { status } : {};
  return SupportTicket.findAll({
    where,
    include: [{ model: User, as: "owner", attributes: ["id", "name", "role"] }],
    order: [["createdAt", "DESC"]],
    limit: 200,
  });
}

async function resolve(ticketId, adminId) {
  const ticket = await SupportTicket.findByPk(ticketId);
  if (!ticket) throw new ApiError(404, "Ticket not found");
  if (ticket.status === "RESOLVED") {
    throw new ApiError(400, "Ticket is already resolved");
  }
  ticket.status = "RESOLVED";
  ticket.resolvedBy = adminId;
  await ticket.save();
  return getFullById(ticketId);
}

module.exports = {
  create,
  getFullById,
  assertAccess,
  addMessage,
  listMine,
  adminList,
  resolve,
};


