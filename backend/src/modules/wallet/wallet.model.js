const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");

const WALLET_TX_TYPES = [
  "TOP_UP",
  "TRANSACTION_DEDUCTION",
  "REFUND",
  "ADJUSTMENT",
];

/// Immutable ledger: every balance change gets one row.
/// balanceBefore/balanceAfter make the history fully auditable.
const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    type: {
      type: DataTypes.ENUM(...WALLET_TX_TYPES),
      allowNull: false,
    },
    amount: {
      // Always positive; `type` decides the direction.
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    referenceId: {
      // e.g. "topup-5" or "tx-12"
      type: DataTypes.STRING(64),
    },
    description: {
      type: DataTypes.STRING(255),
    },
  },
  {
    tableName: "wallet_transactions",
    indexes: [
      { fields: ["user_id"] },
      { fields: ["type"] },
      { fields: ["reference_id"] },
    ],
  }
);

User.hasMany(WalletTransaction, {
  foreignKey: { name: "userId", allowNull: false },
  onDelete: "CASCADE",
});
WalletTransaction.belongsTo(User, {
  foreignKey: { name: "userId", allowNull: false },
});

module.exports = { WalletTransaction, WALLET_TX_TYPES };
