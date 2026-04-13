const dotenv = require("dotenv");
dotenv.config();

const { createApp } = require("./app");
const { connectToDatabase } = require("./config/db");
const { User, ROLES } = require("./models/User");

async function seedAdmin() {
  try {
    const adminEmail = "admin";
    let admin = await User.findOne({ email: adminEmail });
    if (!admin) {
      admin = new User({
        name: "System Admin",
        email: adminEmail,
        role: ROLES.Admin
      });
      admin.password = "123admin";
      await admin.save();
      console.log("Default admin account seeded.");
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

