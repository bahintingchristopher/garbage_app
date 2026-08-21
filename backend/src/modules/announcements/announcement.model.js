const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");

const AUDIENCES = ["GENERAL", "CLIENT", "COLLECTOR"];

const Announcement = sequelize.define(
  "Announcement",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: { notEmpty: true, len: [3, 150] },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    audience: {
      type: DataTypes.ENUM(...AUDIENCES),
      allowNull: false,
      defaultValue: "GENERAL",
    },
    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: User, key: "id" },
    },
    expiresAt: { type: DataTypes.DATE },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "announcements",
    indexes: [{ fields: ["audience"] }, { fields: ["is_active"] }],
  }
);

Announcement.belongsTo(User, {
  foreignKey: { name: "createdBy", allowNull: false },
  as: "author",
});

module.exports = { Announcement, AUDIENCES };
