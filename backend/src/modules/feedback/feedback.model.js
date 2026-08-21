const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");
const { Transaction } = require("../transactions/transaction.model");

const Feedback = sequelize.define(
  "Feedback",
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
    },
    senderId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    receiverId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 },
    },
    comment: { type: DataTypes.TEXT },
  },
  {
    tableName: "feedback",
    indexes: [
      { fields: ["transaction_id"] },
      { fields: ["receiver_id"] },
      // one feedback per sender per transaction
      { unique: true, fields: ["transaction_id", "sender_id"] },
    ],
  }
);

Feedback.belongsTo(User, {
  foreignKey: { name: "senderId", allowNull: false },
  as: "sender",
});
Feedback.belongsTo(User, {
  foreignKey: { name: "receiverId", allowNull: false },
  as: "receiver",
});
Feedback.belongsTo(Transaction, {
  foreignKey: { name: "transactionId", allowNull: false },
});

module.exports = Feedback;
