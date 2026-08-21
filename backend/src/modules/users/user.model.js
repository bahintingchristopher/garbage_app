const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const ROLES = ["CLIENT", "COLLECTOR", "ADMIN"];

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    accountNumber: {
      type: DataTypes.STRING(32),
      unique: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: { notEmpty: true, len: [2, 120] },
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue("email", String(value).trim().toLowerCase());
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    contactNumber: {
      type: DataTypes.STRING(32),
      allowNull: false,
      validate: { notEmpty: true },
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { notEmpty: true },
    },
    role: {
      type: DataTypes.ENUM(...ROLES),
      allowNull: false,
    },
    profilePicture: {
      type: DataTypes.STRING(500),
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "users",
    indexes: [{ fields: ["role"] }],
  }
);

const ClientProfile = sequelize.define(
  "ClientProfile",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    totalOrders: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    rating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "client_profiles" }
);

const CollectorProfile = sequelize.define(
  "CollectorProfile",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    totalCompletedOrders: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    rating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    currentLatitude: { type: DataTypes.DOUBLE, validate: { min: -90, max: 90 } },
    currentLongitude: { type: DataTypes.DOUBLE, validate: { min: -180, max: 180 } },
    locationUpdatedAt: { type: DataTypes.DATE },
  },
  { tableName: "collector_profiles" }
);

const Wallet = sequelize.define(
  "Wallet",
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: "wallets" }
);

User.hasOne(ClientProfile, {
  foreignKey: { name: "userId", allowNull: false },
  onDelete: "CASCADE",
});
ClientProfile.belongsTo(User, { foreignKey: { name: "userId", allowNull: false } });

User.hasOne(CollectorProfile, {
  foreignKey: { name: "userId", allowNull: false },
  onDelete: "CASCADE",
});
CollectorProfile.belongsTo(User, { foreignKey: { name: "userId", allowNull: false } });

User.hasOne(Wallet, {
  foreignKey: { name: "userId", allowNull: false },
  onDelete: "CASCADE",
});
Wallet.belongsTo(User, { foreignKey: { name: "userId", allowNull: false } });

module.exports = { User, ClientProfile, CollectorProfile, Wallet, ROLES };


