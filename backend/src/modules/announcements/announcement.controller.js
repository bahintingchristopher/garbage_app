const asyncHandler = require("../../utils/asyncHandler");
const service = require("./announcement.service");

function format(a) {
  if (!a) return null;
  return {
    id: a.id,
    title: a.title,
    content: a.content,
    audience: a.audience,
    author: a.author ? a.author.name : undefined,
    expiresAt: a.expiresAt,
    isActive: a.isActive,
    createdAt: a.createdAt,
  };
}

exports.list = asyncHandler(async (req, res) => {
  const rows = await service.listForRole(req.user.role);
  res.json({ success: true, data: rows.map(format) });
});

exports.adminList = asyncHandler(async (req, res) => {
  const rows = await service.adminListAll();
  res.json({ success: true, data: rows.map(format) });
});

exports.create = asyncHandler(async (req, res) => {
  const row = await service.create(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Announcement published",
    data: format(row),
  });
});

exports.deactivate = asyncHandler(async (req, res) => {
  const row = await service.deactivate(req.params.id);
  res.json({ success: true, message: "Announcement removed", data: format(row) });
});
