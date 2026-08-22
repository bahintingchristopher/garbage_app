const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");
const { Order } = require("../orders/order.model");
const Material = require("../materials/material.model");

const CONFIRMATION_STATUS = ["PENDING", "CONFIRMED", "AUTO_COMPLETED", "DISPUTED"];

const Transaction = sequelize.define(
  "Transaction",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
      references: { model: Order, key: "id" },
    },
    clientId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    collectorId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    systemFee: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    photo: {
      type: DataTypes.STRING(500),
    },
    confirmationStatus: {
      type: DataTypes.ENUM(...CONFIRMATION_STATUS),
      allowNull: false,
      defaultValue: "PENDING",
    },
    resolvedBy: {
      type: DataTypes.BIGINT,
      references: { model: require("../users/user.model").User, key: "id" },
    },
    resolvedAt: { type: DataTypes.DATE },
    confirmationDeadline: {
      type: DataTypes.DATE,
    },
    completedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "transactions",
    indexes: [
      { fields: ["client_id"] },
      { fields: ["collector_id"] },
      { fields: ["confirmation_status"] },
    ],
  }
);

const TransactionItem = sequelize.define(
  "TransactionItem",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    transactionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: Transaction, key: "id" },
      onDelete: "CASCADE",
    },
    materialId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: Material, key: "id" },
    },
    // Snapshot values: prices may change later, history must not.
    weightKg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    pricePerKg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
  },
  {
    tableName: "transaction_items",
    indexes: [{ fields: ["transaction_id"] }],
  }
);

Transaction.hasMany(TransactionItem, {
  foreignKey: { name: "transactionId", allowNull: false },
  onDelete: "CASCADE",
  as: "items",
});
TransactionItem.belongsTo(Transaction, {
  foreignKey: { name: "transactionId", allowNull: false },
});
TransactionItem.belongsTo(Material, {
  foreignKey: { name: "materialId", allowNull: false },
  as: "material",
});

User.hasMany(Transaction, {
  foreignKey: { name: "clientId", allowNull: false },
  as: "clientTransactions",
});
User.hasMany(Transaction, {
  foreignKey: { name: "collectorId", allowNull: false },
  as: "collectorTransactions",
});
Transaction.belongsTo(User, {
  foreignKey: { name: "clientId", allowNull: false },
  as: "client",
});
Transaction.belongsTo(User, {
  foreignKey: { name: "collectorId", allowNull: false },
  as: "collector",
});
Transaction.belongsTo(Order, {
  foreignKey: { name: "orderId", allowNull: false },
});

module.exports = { Transaction, TransactionItem, CONFIRMATION_STATUS };

