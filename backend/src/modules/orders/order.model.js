const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");
const Material = require("../materials/material.model");

const ORDER_STATUS = [
  "BOOKED",
  "ACCEPTED",
  "ON_THE_WAY",
  "ARRIVED",
  "COLLECTING",
  "COMPLETED_PENDING_CONFIRMATION",
  "CONFIRMED",
  "AUTO_COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const TIME_SLOTS = ["MORNING", "AFTERNOON", "EVENING"];

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    clientId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    collectorId: {
      type: DataTypes.BIGINT,
      references: { model: User, key: "id" },
    },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUS),
      allowNull: false,
      defaultValue: "BOOKED",
    },
    pickupAddress: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    latitude: {
      type: DataTypes.DOUBLE,
      validate: { min: -90, max: 90 },
    },
    longitude: {
      type: DataTypes.DOUBLE,
      validate: { min: -180, max: 180 },
    },
    scheduledDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    timeSlot: {
      type: DataTypes.ENUM(...TIME_SLOTS),
      allowNull: false,
      defaultValue: "MORNING",
    },
    notes: {
      type: DataTypes.TEXT,
    },
    acceptedAt: { type: DataTypes.DATE },
    completedAt: { type: DataTypes.DATE },
  },
  {
    tableName: "orders",
    indexes: [
      { fields: ["status"] },
      { fields: ["client_id"] },
      { fields: ["collector_id"] },
    ],
  }
);

User.hasMany(Order, {
  foreignKey: { name: "clientId", allowNull: false },
  as: "clientOrders",
});
User.hasMany(Order, {
  foreignKey: { name: "collectorId" },
  as: "collectorOrders",
});
Order.belongsTo(User, { foreignKey: { name: "clientId", allowNull: false }, as: "client" });
Order.belongsTo(User, { foreignKey: { name: "collectorId" }, as: "collector" });

// ---- Declared materials for a pickup (client's estimate at booking time) ----
const OrderItem = sequelize.define(
  "OrderItem",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: Order, key: "id" },
      onDelete: "CASCADE",
    },
    materialId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: Material, key: "id" },
    },
    estimatedKg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
  },
  {
    tableName: "order_items",
    indexes: [{ fields: ["order_id"] }],
  }
);

Order.hasMany(OrderItem, {
  foreignKey: { name: "orderId", allowNull: false },
  onDelete: "CASCADE",
  as: "declaredItems",
});
OrderItem.belongsTo(Order, {
  foreignKey: { name: "orderId", allowNull: false },
});
OrderItem.belongsTo(Material, {
  foreignKey: { name: "materialId", allowNull: false },
  as: "material",
});

module.exports = { Order, OrderItem, ORDER_STATUS, TIME_SLOTS };

