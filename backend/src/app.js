const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const { getLocalUploadDir } = require("./services/storageService");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const documentRoutes = require("./routes/documentRoutes");
const blockchainRoutes = require("./routes/blockchainRoutes");
const metadataRoutes = require("./routes/metadataRoutes");
const searchRoutes = require("./routes/searchRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const qrRoutes = require("./routes/qrRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const managementRoutes = require("./routes/managementRoutes");

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  // Serve static files from the uploads directory
  app.use('/uploads', express.static(getLocalUploadDir()));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/blockchain", blockchainRoutes);
  app.use("/api/metadata", metadataRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/verification", verificationRoutes);
  app.use("/api/qr", qrRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/management", managementRoutes);

  app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({
      error: {
        message,
        ...(process.env.NODE_ENV === "production" ? {} : { stack: err.stack }),
      },
    });
  });

  return app;
}

module.exports = { createApp };
