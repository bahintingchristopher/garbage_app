const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { isProd } = require("./config/environment");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later" },
});
app.use("/api", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts, please try again later" },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
if (!isProd) app.use(morgan("dev"));
app.use(express.json({ limit: "1mb" }));

app.use("/api", routes);

// Self-contained admin console (no build step).
app.get("/admin", (req, res) =>
  res.sendFile(path.join(__dirname, "..", "public", "admin.html"))
);
app.use("/admin", express.static(path.join(__dirname, "..", "public")));

app.use(notFound);
app.use(errorHandler);

module.exports = app;



