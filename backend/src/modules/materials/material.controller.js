const asyncHandler = require("../../utils/asyncHandler");
const materialService = require("./material.service");
const { formatMaterial, formatMaterialList } = require("./material.view");

exports.listMaterials = asyncHandler(async (req, res) => {
  // Admin sees inactive materials too; clients/collectors see active only.
  const materials =
    req.user.role === "ADMIN"
      ? await materialService.listAll()
      : await materialService.listActive();
  res.json({
    success: true,
    data: formatMaterialList(materials),
  });
});

exports.getMaterial = asyncHandler(async (req, res) => {
  const material = await materialService.getById(req.params.id);
  res.json({ success: true, data: formatMaterial(material) });
});

exports.createMaterial = asyncHandler(async (req, res) => {
  const material = await materialService.create(req.body);
  res.status(201).json({
    success: true,
    message: "Material created",
    data: formatMaterial(material),
  });
});

exports.updateMaterial = asyncHandler(async (req, res) => {
  const material = await materialService.updatePrice(req.params.id, req.body);
  res.json({
    success: true,
    message: "Material updated",
    data: formatMaterial(material),
  });
});

exports.recordDisposal = asyncHandler(async (req, res) => {
  const disposal = await materialService.recordDisposal(
    req.params.id,
    req.body,
    req.user.id
  );
  res.status(201).json({
    success: true,
    message: "Disposal recorded",
    data: disposal,
  });
});
