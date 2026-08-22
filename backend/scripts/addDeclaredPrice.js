// One-time migration: add order_items.declared_price_per_kg (booking price snapshot).
// Idempotent - safe to run more than once.
const sequelize = require("../src/config/database");

async function main() {
  await sequelize.authenticate();
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable("order_items");
  if (table.declared_price_per_kg) {
    console.log("Column declared_price_per_kg already exists - nothing to do.");
  } else {
    await qi.addColumn("order_items", "declared_price_per_kg", {
      type: require("sequelize").DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    });
    console.log("Added order_items.declared_price_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0");
  }
  await sequelize.close();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});