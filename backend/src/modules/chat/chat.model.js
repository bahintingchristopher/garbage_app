const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");

const Conversation = sequelize.define(
  "Conversation",
  {},
  { tableName: "conversations" }
);

const ConversationParticipant = sequelize.define(
  "ConversationParticipant",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: Conversation, key: "id" },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
      onDelete: "CASCADE",
    },
    lastReadAt: { type: DataTypes.DATE },
  },
  {
    tableName: "conversation_participants",
    indexes: [
      { unique: true, fields: ["conversation_id", "user_id"] },
      { fields: ["user_id"] },
    ],
  }
);

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: Conversation, key: "id" },
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
      validate: { notEmpty: true, len: [1, 2000] },
    },
  },
  {
    tableName: "messages",
    indexes: [{ fields: ["conversation_id"] }],
  }
);

Conversation.hasMany(ConversationParticipant, {
  foreignKey: { name: "conversationId", allowNull: false },
  onDelete: "CASCADE",
  as: "participants",
});
ConversationParticipant.belongsTo(Conversation, {
  foreignKey: { name: "conversationId", allowNull: false },
});
ConversationParticipant.belongsTo(User, {
  foreignKey: { name: "userId", allowNull: false },
  as: "user",
});

Conversation.hasMany(Message, {
  foreignKey: { name: "conversationId", allowNull: false },
  onDelete: "CASCADE",
  as: "messages",
});
Message.belongsTo(Conversation, {
  foreignKey: { name: "conversationId", allowNull: false },
});
Message.belongsTo(User, {
  foreignKey: { name: "senderId", allowNull: false },
  as: "sender",
});

module.exports = { Conversation, ConversationParticipant, Message };
