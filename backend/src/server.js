const dotenv = require("dotenv");
dotenv.config();

const { createApp } = require("./app");
const { connectToDatabase } = require("./config/db");
const { User, ROLES } = require("./models/User");

async function seedAdmin() {
  try {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.log("Admin seeding skipped: INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD not set.");
      return;
    }

    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      console.log(`Seeding initial admin account: ${adminEmail}`);
      admin = new User({
        name: "System Administrator",
        email: adminEmail,
        role: ROLES.Admin
      });
      admin.password = adminPassword;
      await admin.save();
    }
  } catch (err) {
    console.error("Failed to seed admin:", err);
  }
}

async function start() {
  const port = process.env.PORT || 5000;

  await connectToDatabase(process.env.MONGODB_URI);
  await seedAdmin();

  const app = createApp();
  app.listen(port, () => {
    // Keep startup log minimal and useful.
    console.log(`API listening on port ${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

