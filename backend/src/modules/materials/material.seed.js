const Material = require("./material.model");

const DEFAULT_MATERIALS = [
  { name: "PAPER", pricePerKg: 12.0, description: "Newspaper, office paper, magazines" },
  { name: "CARTON", pricePerKg: 15.0, description: "Cardboard boxes and cartons" },
  { name: "PLASTIC_BOTTLE", pricePerKg: 25.0, description: "PET plastic bottles" },
  { name: "GLASS_BOTTLE", pricePerKg: 10.0, description: "Whole glass bottles" },
  { name: "SOFTDRINK_CAN", pricePerKg: 45.0, description: "Aluminum softdrink cans" },
];

/// Inserts the 5 standard materials once, only when the table is empty.
async function seedMaterials() {
  const count = await Material.count();
  if (count > 0) return;
  await Material.bulkCreate(DEFAULT_MATERIALS);
  console.log("[seed] Default materials created:", DEFAULT_MATERIALS.map((m) => m.name).join(", "));
}

module.exports = { seedMaterials, DEFAULT_MATERIALS };
