require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initDb } = require("./db");
const portfolioRoutes = require("./routes/portfolioRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
// Enable Cross-Origin Resource Sharing for frontend communication
app.use(
  cors({
    origin: "*", // Or specify your frontend URL once deployed
    methods: ["GET", "POST"],
  }),
);

// Enable automatic JSON request body parsing
app.use(express.json());

// Server health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount modular portfolio REST API endpoints
app.use("/api/portfolio", portfolioRoutes);

// Catch-all 404 handler for undefined API routes
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Global centralized error-handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err.stack);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Boot database first, then launch HTTP listener
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(
        `🚀 Micro-Fintech API Server running on http://localhost:${PORT}`,
      );
      console.log(
        `📊 Health check available at http://localhost:${PORT}/health`,
      );
    });
  } catch (error) {
    console.error("Failed to initialize database and start server:", error);
    process.exit(1);
  }
}

startServer();
