const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");

const TICKET_STATUS = ["OPEN", "RESOLVED"];

const SupportTicket = sequelize.define(
  "SupportTicket",
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
    subject: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: true, len: [3, 150] },
    },
    status: {
      type: DataTypes.ENUM(...TICKET_STATUS),
      allowNull: false,
      defaultValue: "OPEN",
    },
    resolvedBy: {
      type: DataTypes.BIGINT,
      references: { model: User, key: "id" },
    },
  },
  {
    tableName: "support_tickets",
    indexes: [{ fields: ["user_id"] }, { fields: ["status"] }],
  }
);

const TicketMessage = sequelize.define(
  "TicketMessage",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    ticketId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: SupportTicket, key: "id" },
      onDelete: "CASCADE",
    },
    senderId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
  },
  {
    tableName: "ticket_messages",
    indexes: [{ fields: ["ticket_id"] }],
  }
);

User.hasMany(SupportTicket, {
  foreignKey: { name: "userId", allowNull: false },
});
SupportTicket.belongsTo(User, {
  foreignKey: { name: "userId", allowNull: false },
  as: "owner",
});

SupportTicket.hasMany(TicketMessage, {
  foreignKey: { name: "ticketId", allowNull: false },
  onDelete: "CASCADE",
  as: "messages",
});
TicketMessage.belongsTo(SupportTicket, {
  foreignKey: { name: "ticketId", allowNull: false },
});
TicketMessage.belongsTo(User, {
  foreignKey: { name: "senderId", allowNull: false },
  as: "sender",
});

module.exports = { SupportTicket, TicketMessage, TICKET_STATUS };
