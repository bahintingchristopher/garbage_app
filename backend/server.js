const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/modules/chat/socket");
const sequelize = require("./src/config/database");
const { port, db, env } = require("./src/config/environment");
const { seedMaterials } = require("./src/modules/materials/material.seed");
const { startAutoCompleteJob } = require("./src/jobs/autoComplete.job");

process.on("unhandledRejection", (err) => {
  console.error("[fatal] Unhandled rejection:", err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[fatal] Uncaught exception:", err.message);
  process.exit(1);
});

(async () => {
  let server;
  try {
    await sequelize.authenticate();
    console.log("[db] PostgreSQL connected");

    if (db.sync) {
      await sequelize.sync();
      console.log("[db] Tables synced (auto-create enabled)");
      await seedMaterials();
    }

    server = http.createServer(app);
    initSocket(server);
    server.listen(port, () => {
      console.log(`[server] ${env} mode | http://localhost:${port}/api`);
    });

    startAutoCompleteJob(Number(process.env.AUTOCOMPLETE_INTERVAL_MS) || 60000);
  } catch (err) {
    console.error("[db] Connection failed:", err.message);
    console.error("[db] Check DATABASE_URL in backend/.env");
    process.exit(1);
  }

  const shutdown = async (signal) => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    if (server) server.close();
    await sequelize.close();
    console.log("[server] Database connection closed");
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
