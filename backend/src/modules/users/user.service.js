const bcrypt = require("bcryptjs");
const sequelize = require("../../config/database");
const ApiError = require("../../utils/ApiError");
const {
  User,
  ClientProfile,
  CollectorProfile,
  Wallet,
  ROLES,
} = require("./user.model");

const SALT_ROUNDS = 10;
const ACCOUNT_PREFIX = { CLIENT: "CLT", COLLECTOR: "COL", ADMIN: "ADM" };

async function findByEmail(email) {
  return User.findOne({ where: { email: String(email).trim().toLowerCase() } });
}

async function findActiveById(id) {
  const user = await User.findByPk(id, {
    include: [ClientProfile, CollectorProfile, Wallet],
  });
  if (!user || !user.isActive) return null;
  return user;
}

function buildAccountNumber(role, id) {
  const prefix = ACCOUNT_PREFIX[role] || "USR";
  return `${prefix}-${new Date().getFullYear()}-${String(id).padStart(5, "0")}`;
}

async function createUser({ name, email, password, contactNumber, address, role }) {
  if (!name || !email || !password || !contactNumber || !address) {
    throw new ApiError(
      400,
      "name, email, password, contactNumber and address are required"
    );
  }
  if (!ROLES.includes(role)) {
    throw new ApiError(400, `role must be one of: ${ROLES.join(", ")}`);
  }
  if (String(password).length < 6) {
    throw new ApiError(400, "password must be at least 6 characters");
  }
  if (await findByEmail(email)) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);

  const user = await sequelize.transaction(async (t) => {
    const created = await User.create(
      { name, email, passwordHash, contactNumber, address, role },
      { transaction: t }
    );

    await created.update(
      { accountNumber: buildAccountNumber(role, created.id) },
      { transaction: t }
    );

    if (role === "CLIENT") {
      await ClientProfile.create({ userId: created.id }, { transaction: t });
    }
    if (role === "COLLECTOR") {
      await CollectorProfile.create({ userId: created.id }, { transaction: t });
      await Wallet.create({ userId: created.id }, { transaction: t });
    }

    return created;
  });

  return User.findByPk(user.id, {
    include: [ClientProfile, CollectorProfile, Wallet],
  });
}

module.exports = { findByEmail, findActiveById, createUser };
