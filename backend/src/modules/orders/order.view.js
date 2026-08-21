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
  };
}

function formatOrderList(orders) {
  return (orders || []).map(formatOrder);
}

module.exports = { formatOrder, formatOrderList };
