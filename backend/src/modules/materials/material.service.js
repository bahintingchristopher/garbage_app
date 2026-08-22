const ApiError = require("../../utils/ApiError");
const Material = require("./material.model");
const MaterialDisposal = require("./material_disposal.model");

async function listActive() {
  return Material.findAll({ where: { isActive: true }, order: [["name", "ASC"]] });
}

async function listAll() {
  return Material.findAll({ order: [["name", "ASC"]] });
}

async function getById(id) {
  const material = await Material.findByPk(id);
  if (!material) throw new ApiError(404, "Material not found");
  return material;
}

async function create({ name, pricePerKg, description }) {
  if (!name || pricePerKg === undefined || pricePerKg === null) {
    throw new ApiError(400, "name and pricePerKg are required");
  }
  if (Number(pricePerKg) < 0 || isNaN(Number(pricePerKg))) {
    throw new ApiError(400, "pricePerKg must be a positive number");
  }
  const exists = await Material.findOne({
    where: { name: String(name).trim().toUpperCase() },
  });
  if (exists) throw new ApiError(409, "A material with this name already exists");

  return Material.create({
    name: String(name).trim().toUpperCase(),
    pricePerKg,
    description,
  });
}

async function updatePrice(id, { name, pricePerKg, description, isActive }) {
  const material = await getById(id);

  if (name !== undefined && name !== null) {
    const newName = String(name).trim().toUpperCase();
    if (!newName) throw new ApiError(400, "name cannot be empty");
    if (newName !== material.name) {
      const exists = await Material.findOne({ where: { name: newName } });
      if (exists) {
        throw new ApiError(409, "A material with this name already exists");
      }
      material.name = newName;
    }
  }
  if (pricePerKg !== undefined && pricePerKg !== null) {
    if (Number(pricePerKg) < 0 || isNaN(Number(pricePerKg))) {
      throw new ApiError(400, "pricePerKg must be a positive number");
    }
    material.pricePerKg = pricePerKg;
  }
  if (description !== undefined) material.description = description;
  if (isActive !== undefined) material.isActive = Boolean(isActive);

  await material.save();
  return material;
}

async function recordDisposal(id, { weightKg, notes } = {}, adminId) {
  const material = await getById(id);
  const kg = Number(weightKg);
  if (isNaN(kg) || kg <= 0) {
    throw new ApiError(400, "weightKg must be a positive number");
  }
  return MaterialDisposal.create({
    materialId: material.id,
    weightKg: kg,
    notes: notes || null,
    disposedBy: adminId || null,
  });
}

module.exports = {
  listActive,
  listAll,
  getById,
  create,
  updatePrice,
  recordDisposal,
};
