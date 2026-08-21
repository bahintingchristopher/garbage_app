const ApiError = require("../../utils/ApiError");
const { Vehicle, VEHICLE_TYPES } = require("./vehicle.model");

async function listByCollector(collectorId) {
  return Vehicle.findAll({
    where: { collectorId },
    order: [["createdAt", "DESC"]],
  });
}

async function getById(id) {
  const vehicle = await Vehicle.findByPk(id);
  if (!vehicle) throw new ApiError(404, "Vehicle not found");
  return vehicle;
}

async function create(collectorId, { vehicleType, plateNumber }) {
  if (!VEHICLE_TYPES.includes(vehicleType)) {
    throw new ApiError(
      400,
      `vehicleType must be one of: ${VEHICLE_TYPES.join(", ")}`
    );
  }

  // Only 3 and 4 wheel vehicles need plate numbers (tricycles are registered).
  if (vehicleType !== "TWO_WHEELS" && !plateNumber) {
    throw new ApiError(
      400,
      "plateNumber is required for THREE_WHEELS and FOUR_WHEELS vehicles"
    );
  }

  return Vehicle.create({ collectorId, vehicleType, plateNumber });
}

async function update(id, collectorId, { vehicleType, plateNumber }) {
  const vehicle = await getById(id);

  if (Number(vehicle.collectorId) !== Number(collectorId)) {
    throw new ApiError(403, "You can only update your own vehicles");
  }
  if (vehicleType !== undefined) {
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      throw new ApiError(
        400,
        `vehicleType must be one of: ${VEHICLE_TYPES.join(", ")}`
      );
    }
    vehicle.vehicleType = vehicleType;
  }
  if (plateNumber !== undefined) vehicle.plateNumber = plateNumber;

  await vehicle.save();
  return vehicle;
}

async function remove(id, collectorId) {
  const vehicle = await getById(id);
  if (Number(vehicle.collectorId) !== Number(collectorId)) {
    throw new ApiError(403, "You can only delete your own vehicles");
  }
  await vehicle.destroy();
}

module.exports = { listByCollector, getById, create, update, remove };

