const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const { User } = require("../users/user.model");

const VEHICLE_TYPES = ["TWO_WHEELS", "THREE_WHEELS", "FOUR_WHEELS"];

const Vehicle = sequelize.define(
  "Vehicle",
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
    vehicleType: {
      type: DataTypes.ENUM(...VEHICLE_TYPES),
      allowNull: false,
    },
    plateNumber: {
      type: DataTypes.STRING(20),
      set(value) {
        this.setDataValue(
          "plateNumber",
          value ? String(value).trim().toUpperCase() : null
        );
      },
    },
  },
  {
    tableName: "vehicles",
    indexes: [{ fields: ["collector_id"] }],
  }
);

User.hasMany(Vehicle, {
  foreignKey: { name: "collectorId", allowNull: false },
  onDelete: "CASCADE",
});
Vehicle.belongsTo(User, {
  foreignKey: { name: "collectorId", allowNull: false },
  as: "collector",
});

module.exports = { Vehicle, VEHICLE_TYPES };
