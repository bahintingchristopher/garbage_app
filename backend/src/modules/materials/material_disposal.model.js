const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");
const Material = require("./material.model");

const MaterialDisposal = sequelize.define(
  "MaterialDisposal",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    materialId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    weightKg: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    notes: {
      type: DataTypes.TEXT,
    },
    disposedBy: {
      type: DataTypes.BIGINT,
    },
  },
  {
    tableName: "material_disposals",
    indexes: [{ fields: ["material_id"] }],
  }
);

Material.hasMany(MaterialDisposal, {
  foreignKey: { name: "materialId", allowNull: false },
  as: "disposals",
});
MaterialDisposal.belongsTo(Material, {
  foreignKey: { name: "materialId", allowNull: false },
  as: "material",
});

module.exports = MaterialDisposal;