const multer = require("multer");
const { isProd } = require("../config/environment");

function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.name === "SequelizeUniqueConstraintViolation") {
    statusCode = 409;
    message = "A record with these details already exists";
  }
  if (err.name === "SequelizeValidationError") {
    statusCode = 400;
    message = err.errors.map((e) => e.message).join(", ");
  }
  if (err.message === "INVALID_FILE_TYPE") {
    statusCode = 400;
    message = "Only JPG, PNG or WEBP images are allowed";
  }
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Photo exceeds the 5MB limit"
        : `Upload error: ${err.code}`;
  }
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (!isProd && statusCode >= 500) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = { notFound, errorHandler };

