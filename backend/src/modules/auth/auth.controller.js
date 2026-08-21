const asyncHandler = require("../../utils/asyncHandler");
const authService = require("./auth.service");
const { formatAuthResponse } = require("./auth.view");

exports.register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({
    success: true,
    message: "Account registered successfully",
    data: formatAuthResponse(user, token),
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login(email, password);
  res.json({
    success: true,
    message: "Login successful",
    data: formatAuthResponse(user, token),
  });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  res.json({
    success: true,
    data: formatAuthResponse(user, null).user,
  });
});
