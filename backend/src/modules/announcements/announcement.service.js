const { Op } = require("sequelize");
const ApiError = require("../../utils/ApiError");
const { Announcement, AUDIENCES } = require("./announcement.model");

async function create(adminId, { title, content, audience, expiresAt }) {
  if (!title || !content) {
    throw new ApiError(400, "title and content are required");
  }
  if (!AUDIENCES.includes(audience)) {
    throw new ApiError(400, `audience must be one of: ${AUDIENCES.join(", ")}`);
  }
  return Announcement.create({
    title: String(title).trim(),
    content: String(content).trim(),
    audience,
    createdBy: adminId,
    expiresAt: expiresAt || null,
  });
}

/// Users only see GENERAL + posts targeted at their own role.
async function listForRole(role) {
  const audiences =
    role === "CLIENT"
      ? ["GENERAL", "CLIENT"]
      : role === "COLLECTOR"
        ? ["GENERAL", "COLLECTOR"]
        : AUDIENCES; // admin sees everything

  return Announcement.findAll({
    where: {
      isActive: true,
      audience: { [Op.in]: audiences },
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
    },
    order: [["createdAt", "DESC"]],
    limit: 100,
  });
}

async function adminListAll() {
  return Announcement.findAll({ order: [["createdAt", "DESC"]], limit: 200 });
}

async function update(id, { title, content, audience } = {}) {
  const announcement = await Announcement.findByPk(id);
  if (!announcement) throw new ApiError(404, "Announcement not found");
  if (title !== undefined) {
    if (!String(title).trim()) throw new ApiError(400, "title cannot be empty");
    announcement.title = String(title).trim();
  }
  if (content !== undefined) {
    if (!String(content).trim()) throw new ApiError(400, "content cannot be empty");
    announcement.content = String(content).trim();
  }
  if (audience !== undefined) {
    if (!AUDIENCES.includes(audience)) {
      throw new ApiError(
        400,
        `audience must be one of: ${AUDIENCES.join(", ")}`
      );
    }
    announcement.audience = audience;
  }
  await announcement.save();
  return announcement;
}

async function remove(id) {
  const announcement = await Announcement.findByPk(id);
  if (!announcement) throw new ApiError(404, "Announcement not found");
  await announcement.destroy();
}

module.exports = { create, listForRole, adminListAll, update, remove };
