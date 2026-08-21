const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwt: jwtConfig } = require("../../config/environment");
const ApiError = require("../../utils/ApiError");
const userService = require("../users/user.service");

const REGISTRABLE_ROLES = ["CLIENT", "COLLECTOR"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
}

async function register(data) {
  const { name, email, password, contactNumber, address, role } = data;

  if (!role) {
    throw new ApiError(400, "role is required (CLIENT or COLLECTOR)");
  }
  if (!REGISTRABLE_ROLES.includes(role)) {
    throw new ApiError(
      400,
      `Public registration only allows: ${REGISTRABLE_ROLES.join(", ")}. Admin accounts are created by the system.`
    );
  }
  if (!email || !EMAIL_REGEX.test(String(email))) {
    throw new ApiError(400, "A valid email is required");
  }

  const user = await userService.createUser({
    name,
    email,
    password,
    contactNumber,
    address,
    role,
  });

  return { user, token: generateToken(user) };
}

async function login(email, password) {
  if (!email || !password) {
    throw new ApiError(400, "email and password are required");
  }

  const user = await userService.findByEmail(email);
  const valid =
    user && (await bcrypt.compare(String(password), user.passwordHash));

  if (!valid || !user.isActive) {
    throw new ApiError(401, "Invalid email or password");
  }

  const fullUser = await userService.findActiveById(user.id);
  return { user: fullUser, token: generateToken(fullUser) };
}

async function getMe(userId) {
  const user = await userService.findActiveById(userId);
  if (!user) throw new ApiError(404, "Account not found");
  return user;
}

module.exports = { register, login, getMe };
