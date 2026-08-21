const asyncHandler = require("../../utils/asyncHandler");
const service = require("./statistics.service");

exports.myStats = asyncHandler(async (req, res) => {
  const data =
    req.user.role === "CLIENT"
      ? await service.clientStats(req.user.id)
      : req.user.role === "COLLECTOR"
        ? await service.collectorStats(req.user.id)
        : await service.adminStats();
  res.json({ success: true, data });
});

exports.adminStats = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.adminStats() });
});
