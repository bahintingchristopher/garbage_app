function formatUser(user) {
  if (!user) return null;

  const data = {
    id: user.id,
    accountNumber: user.accountNumber,
    name: user.name,
    email: user.email,
    contactNumber: user.contactNumber,
    address: user.address,
    role: user.role,
    profilePicture: user.profilePicture,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  if (user.ClientProfile) {
    data.clientStats = {
      totalOrders: user.ClientProfile.totalOrders,
      rating: Number(user.ClientProfile.rating),
    };
  }

  if (user.CollectorProfile) {
    data.collectorStats = {
      totalCompletedOrders: user.CollectorProfile.totalCompletedOrders,
      rating: Number(user.CollectorProfile.rating),
    };
  }

  if (user.Wallet) {
    data.wallet = {
      balance: Number(user.Wallet.balance),
    };
  }

  return data;
}

module.exports = { formatUser };
