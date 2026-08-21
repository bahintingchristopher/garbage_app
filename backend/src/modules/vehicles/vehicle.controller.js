const asyncHandler = require("../../utils/asyncHandler");
const vehicleService = require("./vehicle.service");
const { formatVehicle, formatVehicleList } = require("./vehicle.view");

exports.listMyVehicles = asyncHandler(async (req, res) => {
  const vehicles = await vehicleService.listByCollector(req.user.id);
  res.json({ success: true, data: formatVehicleList(vehicles) });
});

exports.createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.create(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Vehicle registered",
    data: formatVehicle(vehicle),
  });
});

exports.updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.update(
    req.params.id,
    req.user.id,
    req.body
  );
  res.json({
    success: true,
    message: "Vehicle updated",
    data: formatVehicle(vehicle),
  });
});

exports.deleteVehicle = asyncHandler(async (req, res) => {
  await vehicleService.remove(req.params.id, req.user.id);
  res.json({ success: true, message: "Vehicle deleted" });
});
