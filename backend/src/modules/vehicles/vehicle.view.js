function formatVehicle(vehicle) {
  if (!vehicle) return null;
  return {
    id: vehicle.id,
    collectorId: vehicle.collectorId,
    vehicleType: vehicle.vehicleType,
    plateNumber: vehicle.plateNumber,
    createdAt: vehicle.createdAt,
  };
}

function formatVehicleList(vehicles) {
  return (vehicles || []).map(formatVehicle);
}

module.exports = { formatVehicle, formatVehicleList };
