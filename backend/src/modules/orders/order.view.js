function formatUserBrief(user) {
  if (!user) return null;
  const data = {
    id: user.id,
    name: user.name,
    contactNumber: user.contactNumber,
    accountNumber: user.accountNumber,
  };
  if (user.ClientProfile) data.rating = Number(user.ClientProfile.rating);
  if (user.CollectorProfile) data.rating = Number(user.CollectorProfile.rating);
  return data;
}

function formatOrder(order) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    pickupAddress: order.pickupAddress,
    latitude: order.latitude,
    longitude: order.longitude,
    scheduledDate: order.scheduledDate,
    timeSlot: order.timeSlot,
    notes: order.notes,
    client: formatUserBrief(order.client),
    collector: formatUserBrief(order.collector),
    acceptedAt: order.acceptedAt,
    completedAt: order.completedAt,
    createdAt: order.createdAt,
    // Booking-time estimate lines (client-declared materials + snapshot price).
    declaredItems: (order.declaredItems || []).map((di) => ({
      materialId: di.materialId,
      material: di.material ? di.material.name : null,
      estimatedKg: Number(di.estimatedKg),
      declaredPricePerKg: Number(di.declaredPricePerKg),
      subtotal:
        Math.round(Number(di.estimatedKg) * Number(di.declaredPricePerKg) * 100) /
        100,
    })),
  };
}

function formatOrderList(orders) {
  return (orders || []).map(formatOrder);
}

module.exports = { formatOrder, formatOrderList };
