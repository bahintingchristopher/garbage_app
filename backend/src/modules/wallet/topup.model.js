const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");

const PAYMENT_METHODS = ["GCASH", "BANK"];
const TOPUP_STATUS = ["PENDING", "APPROVED", "REJECTED"];

const TopUp = sequelize.define(
  "TopUp",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    collectorId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: { min: 1 },
    },
    paymentMethod: {
      type: DataTypes.ENUM(...PAYMENT_METHODS),
      allowNull: false,
    },
    referenceNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true },
    },
    status: {
      type: DataTypes.ENUM(...TOPUP_STATUS),
      allowNull: false,
      defaultValue: "PENDING",
    },
    reviewedBy: {
      type: DataTypes.BIGINT,
      references: { model: User, key: "id" },
    },
    reviewedAt: { type: DataTypes.DATE },
    rejectionReason: {
      type: DataTypes.STRING(255),
    },
  },
  {
    tableName: "top_ups",
    indexes: [{ fields: ["status"] }, { fields: ["collector_id"] }],
  }
);

TopUp.belongsTo(User, {
  foreignKey: { name: "collectorId", allowNull: false },
  as: "collector",
});
TopUp.belongsTo(User, { foreignKey: { name: "reviewedBy" }, as: "reviewer" });

module.exports = { TopUp, PAYMENT_METHODS, TOPUP_STATUS };
