const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../config/environment");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const userService = require("../modules/users/user.service");

const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, "Authentication required. Send: Authorization: Bearer <token>");
  }

  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.secret);
  } catch (_) {
    throw new ApiError(401, "Invalid or expired token. Please log in again.");
  }

  const user = await userService.findActiveById(payload.id);
  if (!user) {
    throw new ApiError(401, "Account not found or deactivated");
  }

  req.user = user;
  next();
});

module.exports = requireAuth;
