const { Sequelize } = require("sequelize");
const { db, isProd } = require("./environment");

function buildOptions() {
  const options = {
    dialect: "postgres",
    logging: isProd ? false : (sql) => console.log(sql),
    define: { underscored: true, timestamps: true },
  };

  try {
    const { hostname } = new URL(db.url);
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    if (!isLocal) {
      options.dialectOptions = {
        ssl: { require: true, rejectUnauthorized: false },
      };
      options.ssl = true;
    }
  } catch (_) {
    // invalid URL: let Sequelize report the error on connect
  }

  return options;
}

const sequelize = new Sequelize(db.url, buildOptions());

module.exports = sequelize;
