const asyncHandler = require("../../utils/asyncHandler");
const orderService = require("./order.service");
const { formatOrder, formatOrderList } = require("./order.view");

exports.book = asyncHandler(async (req, res) => {
  const order = await orderService.book(req.user.id, req.body);
  res.status(201).json({
    success: true,
    message: "Pickup booked. Collectors can now see your request.",
    data: formatOrder(await orderService.getFullById(order.id)),
  });
});

exports.myOrders = asyncHandler(async (req, res) => {
  const orders =
    req.user.role === "CLIENT"
      ? await orderService.listForClient(req.user.id)
      : await orderService.listForCollector(req.user.id);
  res.json({ success: true, data: formatOrderList(orders) });
});

/// Map pins for collectors: open BOOKED pickups + my active jobs.
exports.activeLocations = asyncHandler(async (req, res) => {
  const rows = await orderService.listActiveLocations(req.user.id);
  res.json({
    success: true,
    data: rows.map((o) => ({
      orderId: o.id,
      status: o.status,
      pickupAddress: o.pickupAddress,
      scheduledDate: o.scheduledDate,
      timeSlot: o.timeSlot,
      latitude: Number(o.latitude),
      longitude: Number(o.longitude),
      client: {
        id: o.client.id,
        name: o.client.name,
        contactNumber: o.client.contactNumber,
      },
      items: (o.declaredItems || []).map((di) => ({
        material: di.material ? di.material.name : null,
        estimatedKg: Number(di.estimatedKg),
        declaredPricePerKg: Number(di.declaredPricePerKg),
        subtotal:
          Math.round(Number(di.estimatedKg) * Number(di.declaredPricePerKg) * 100) /
          100,
      })),
    })),
  });
});

exports.availableOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.listAvailable();
  res.json({ success: true, data: formatOrderList(orders) });
});

exports.getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getFullById(req.params.id);
  const isOwner =
    Number(order.clientId) === Number(req.user.id) || Number(order.collectorId) === Number(req.user.id);
  if (!isOwner && req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this order",
    });
  }
  res.json({ success: true, data: formatOrder(order) });
});

exports.claim = asyncHandler(async (req, res) => {
  const order = await orderService.claim(req.params.id, req.user.id);
  res.json({
    success: true,
    message: "Order claimed! Head to the pickup address.",
    data: formatOrder(order),
  });
});

exports.advanceStatus = asyncHandler(async (req, res) => {
  const order = await orderService.advanceStatus(
    req.params.id,
    req.user.id,
    req.body.status
  );
  res.json({
    success: true,
    message: `Order is now ${order.status}`,
    data: formatOrder(order),
  });
});

exports.cancel = asyncHandler(async (req, res) => {
  const order = await orderService.cancelByClient(req.params.id, req.user.id);
  res.json({
    success: true,
    message: "Booking cancelled",
    data: formatOrder(order),
  });
});



