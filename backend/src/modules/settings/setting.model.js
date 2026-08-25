const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const Setting = sequelize.define(
  "Setting",
  {
    key: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    value: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "",
    },
    updatedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    tableName: "app_settings",
    timestamps: true,
    updatedAt: "updatedAt",
    createdAt: "createdAt",
  }
);

module.exports = Setting;
