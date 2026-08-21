const bcrypt = require("bcryptjs");
const sequelize = require("../src/config/database");
const { User, ROLES } = require("../src/modules/users/user.model");

const SALT_ROUNDS = 10;

async function main() {
  const [name, email, password, contactNumber, address] = process.argv.slice(2);

  if (!name || !email || !password || !contactNumber || !address) {
    console.log("Usage: npm run seed:admin -- <name> <email> <password> <contactNumber> <address>");
    console.log('Example: npm run seed:admin -- "System Admin" admin@garbageapp.com secret123 09171234567 "City Hall"');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const exists = await User.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (exists) {
      console.error(`Admin with email ${email} already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const admin = await User.create({
      name,
      email,
      passwordHash,
      contactNumber,
      address,
      role: ROLES[2],
    });
    await admin.update({
      accountNumber: `ADM-${new Date().getFullYear()}-${String(admin.id).padStart(5, "0")}`,
    });

    console.log(`Admin created: id=${admin.id} accountNumber=${admin.accountNumber} email=${admin.email}`);
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
}

main();
