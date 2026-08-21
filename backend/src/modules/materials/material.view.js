function formatMaterial(material) {
  if (!material) return null;
  return {
    id: material.id,
    name: material.name,
    pricePerKg: Number(material.pricePerKg),
    description: material.description,
    isActive: material.isActive,
  };
}

function formatMaterialList(materials) {
  return (materials || []).map(formatMaterial);
}

module.exports = { formatMaterial, formatMaterialList };
