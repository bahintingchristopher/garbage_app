const asyncHandler = require("../../utils/asyncHandler");
const service = require("./feedback.service");

function format(f) {
  if (!f) return null;
  return {
    id: f.id,
    transactionId: f.transactionId,
    rating: f.rating,
    comment: f.comment,
    sender: f.sender ? { id: f.sender.id, name: f.sender.name } : null,
    receiver: f.receiver ? { id: f.receiver.id, name: f.receiver.name } : null,
    createdAt: f.createdAt,
  };
}

exports.submit = asyncHandler(async (req, res) => {
  const row = await service.submit(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Feedback submitted. Thank you!",
    data: format(row),
  });
});

exports.forTransaction = asyncHandler(async (req, res) => {
  const rows = await service.listForTransaction(
    req.params.transactionId,
    req.user.id,
    req.user.role
  );
  res.json({ success: true, data: rows.map(format) });
});

exports.mySummary = asyncHandler(async (req, res) => {
  const summary = await service.summaryFor(req.user.id);
  res.json({
    success: true,
    data: {
      count: summary.count,
      averageRating: summary.average,
      recent: summary.recent.map(format),
    },
  });
});
