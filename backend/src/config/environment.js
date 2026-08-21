require("dotenv").config();

const env = process.env.NODE_ENV || "development";

module.exports = {
  env,
  isProd: env === "production",
  port: parseInt(process.env.PORT, 10) || 5000,
  db: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/garbage_app",
    sync: process.env.DB_SYNC !== "false",
  },
  ecoin: {
    feePerTransaction: Number(process.env.ECOIN_FEE_PER_TRANSACTION) || 10,
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev_only_secret_change_me_in_production",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
};

