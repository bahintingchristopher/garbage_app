const asyncHandler = require("../../utils/asyncHandler");
const service = require("./support.service");

function formatMessage(m) {
  return {
    id: m.id,
    message: m.message,
    sender: m.sender
      ? { id: m.sender.id, name: m.sender.name, role: m.sender.role }
      : null,
    createdAt: m.createdAt,
  };
}

function formatTicket(t, withMessages = false) {
  if (!t) return null;
  const data = {
    id: t.id,
    subject: t.subject,
    status: t.status,
    owner: t.owner ? { id: t.owner.id, name: t.owner.name } : undefined,
    createdAt: t.createdAt,
  };
  if (withMessages) data.messages = (t.messages || []).map(formatMessage);
  return data;
}

exports.create = asyncHandler(async (req, res) => {
  const ticket = await service.create(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Support ticket created. Our team will respond soon.",
    data: formatTicket(ticket, true),
  });
});

exports.myTickets = asyncHandler(async (req, res) => {
  const rows = await service.listMine(req.user.id);
  res.json({ success: true, data: rows.map((r) => formatTicket(r)) });
});

exports.adminList = asyncHandler(async (req, res) => {
  const rows = await service.adminList(req.query.status);
  res.json({ success: true, data: rows.map((r) => formatTicket(r)) });
});

exports.getTicket = asyncHandler(async (req, res) => {
  const ticket = await service.getFullById(req.params.id);
  service.assertAccess(ticket, req.user);
  res.json({ success: true, data: formatTicket(ticket, true) });
});

exports.addMessage = asyncHandler(async (req, res) => {
  const ticket = await service.addMessage(
    req.params.id,
    req.user,
    req.body.message
  );
  res.json({
    success: true,
    message: "Message sent",
    data: formatTicket(ticket, true),
  });
});

exports.resolve = asyncHandler(async (req, res) => {
  const ticket = await service.resolve(req.params.id, req.user.id);
  res.json({
    success: true,
    message: "Ticket resolved",
    data: formatTicket(ticket),
  });
});
