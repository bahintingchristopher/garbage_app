const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const { isProd } = require("./config/environment");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

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


