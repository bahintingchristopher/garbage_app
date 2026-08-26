const { Op } = require("sequelize");
const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const { CollectorProfile, ClientProfile, User } = require("../users/user.model");
const { getCollectorIdsForClient, getClientIdsForCollector } = require("./collector.service");

function parseCoord(value, min, max, label) {
  const n = Number(value);
  if (isNaN(n) || n < min || n > max) {
    throw new ApiError(400, `${label} must be between ${min} and ${max}`);
  }
  return n;
}

/// Collector pushes live GPS coordinates (called periodically by the app).
/// Also broadcasts the location to any tracking clients via Socket.IO.
exports.updateLocation = asyncHandler(async (req, res) => {
  const lat = parseCoord(req.body.latitude, -90, 90, "latitude");
  const lng = parseCoord(req.body.longitude, -180, 180, "longitude");

  const profile = await CollectorProfile.findOne({ where: { userId: req.user.id } });
  if (!profile) throw new ApiError(404, "Collector profile not found");

  profile.currentLatitude = lat;
  profile.currentLongitude = lng;
  profile.locationUpdatedAt = new Date();
  await profile.save();

  // Broadcast to tracking clients
  try {
    const { getIO } = require("../chat/socket");
    const io = getIO();
    if (io) {
      const clientIds = await getClientIdsForCollector(Number(req.user.id));
      for (const cid of clientIds) {
        io.to("tracking:" + cid).emit("collector_location_update", {
          collectorId: Number(req.user.id),
          name: req.user.name,
          latitude: lat,
          longitude: lng,
          updatedAt: profile.locationUpdatedAt,
        });
      }
    }
  } catch (_) {
    /* non-fatal */
  }

  res.json({
    success: true,
    message: "Location updated",
    data: {
      latitude: profile.currentLatitude,
      longitude: profile.currentLongitude,
      updatedAt: profile.locationUpdatedAt,
    },
  });
});

/// Client pushes live GPS coordinates (called periodically by the app).
/// Also broadcasts the location to any tracking collectors via Socket.IO.
exports.updateClientLocation = asyncHandler(async (req, res) => {
  const lat = parseCoord(req.body.latitude, -90, 90, "latitude");
  const lng = parseCoord(req.body.longitude, -180, 180, "longitude");

  const profile = await ClientProfile.findOne({ where: { userId: req.user.id } });
  if (!profile) throw new ApiError(404, "Client profile not found");

  profile.currentLatitude = lat;
  profile.currentLongitude = lng;
  profile.locationUpdatedAt = new Date();
  await profile.save();

  // Broadcast to tracking collectors
  try {
    const { getIO } = require("../chat/socket");
    const io = getIO();
    if (io) {
      const collectorIds = await getCollectorIdsForClient(Number(req.user.id));
      for (const collId of collectorIds) {
        io.to("tracking:" + collId).emit("client_location_update", {
          clientId: Number(req.user.id),
          name: req.user.name,
          latitude: lat,
          longitude: lng,
          updatedAt: profile.locationUpdatedAt,
        });
      }
    }
  } catch (_) {
    /* non-fatal */
  }

  res.json({
    success: true,
    message: "Client location updated",
    data: {
      latitude: profile.currentLatitude,
      longitude: profile.currentLongitude,
      updatedAt: profile.locationUpdatedAt,
    },
  });
});

/// Anyone logged in may view a collector's last known location (for the map).
/// All collectors that have reported a location (for the client map).
exports.listLocations = asyncHandler(async (req, res) => {
  const profiles = await CollectorProfile.findAll({
    where: { currentLatitude: { [Op.ne]: null } },
    include: [
      {
        model: User,
        attributes: ["id", "name", "isActive"],
        where: { isActive: true },
      },
    ],
  });
  res.json({
    success: true,
    data: profiles.map((p) => ({
      collectorId: Number(p.userId),
      name: p.User.name,
      latitude: p.currentLatitude,
      longitude: p.currentLongitude,
      updatedAt: p.locationUpdatedAt,
    })),
  });
});

/// Returns live client locations for the assigned collector's active orders.
exports.listClientLocations = asyncHandler(async (req, res) => {
  const clientIds = await getClientIdsForCollector(Number(req.user.id));

  if (clientIds.length === 0) {
    return res.json({ success: true, data: [] });
  }

  const profiles = await ClientProfile.findAll({
    where: {
      userId: { [Op.in]: clientIds },
      currentLatitude: { [Op.ne]: null },
    },
    include: [
      {
        model: User,
        attributes: ["id", "name", "isActive"],
        where: { isActive: true },
      },
    ],
  });

  res.json({
    success: true,
    data: profiles.map((p) => ({
      clientId: Number(p.userId),
      name: p.User.name,
      latitude: p.currentLatitude,
      longitude: p.currentLongitude,
      updatedAt: p.locationUpdatedAt,
    })),
  });
});

exports.getLocation = asyncHandler(async (req, res) => {
  const profile = await CollectorProfile.findOne({
    where: { userId: req.params.collectorId },
    attributes: ["userId", "currentLatitude", "currentLongitude", "locationUpdatedAt"],
  });
  if (!profile || profile.currentLatitude == null) {
    throw new ApiError(404, "No location available for this collector yet");
  }
  res.json({
    success: true,
    data: {
      collectorId: Number(profile.userId),
      latitude: profile.currentLatitude,
      longitude: profile.currentLongitude,
      updatedAt: profile.locationUpdatedAt,
    },
  });
});
