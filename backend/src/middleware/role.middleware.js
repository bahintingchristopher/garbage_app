const ApiError = require("../utils/ApiError");

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access denied. This action requires role: ${roles.join(" or ")}`
        )
      );
    }
    next();
  };
}

module.exports = { requireRole };
