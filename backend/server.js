const cluster = require("cluster");
const os = require("os");
const process = require("process");

const numCPUs = os.cpus().length;
if (cluster.isPrimary) {
  console.log(`======================================`);
  console.log(`Civix Backend Primary Process Started`);
  console.log(`Primary PID:${process.pid}`);
  console.log(`=======================================`);
  console.log(`Forking server for ${numCPUs} CPU Cores...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("online", (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });

  cluster.on("exit", (worker, code, signal) => {
    console.error(
      `Worker ${worker.process.pid} died. Code: ${code}, Signal: ${signal}`
    );
    if (worker.exitedAfterDisconnect === true) {
      console.log(
        `Worker ${worker.process.pid} exited shutting down gracefully.`
      );
    } else {
      console.log(
        `Worker ${worker.process.pid} exited unexpectedly. Restarting...`
      );
      cluster.fork();
    }
  });
} else {
  const express = require("express");
  const cors = require("cors");
  const helmet = require("helmet");
  const cookieParser = require("cookie-parser");
  const rateLimit = require("express-rate-limit");
  const path = require("path");
  require("dotenv").config();

  // Security middlewares
  const { xssSanitizer } = require("./middlewares/xssSanitizer");
  const {
    skipCSRFForRoutes,
    csrfErrorHandler,
  } = require("./middlewares/csrfProtection");

  const app = express();

  // === Database Initialization ===

  // Commented db.js import so that the app can run on MongoDB only to rectify the issue of multiple database connections

  // require("./config/db.js");     // PostgreSQL
  require("./config/mongo.js"); // MongoDB

  // === Swagger Docs ===
  const { swaggerUi, specs } = require("./config/swagger.js");

  // === Middlewares ===
  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        "https://civix-phi.vercel.app/login",
        "https://civix-phi.vercel.app/signup",
      ],
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // === Security Middlewares ===
  // Global XSS Sanitization
  app.use(xssSanitizer);

  // CSRF Protection (skip for certain routes)
  const csrfSkipRoutes = [
    "/api/contributors", // Public read-only API
    "/api-docs", // Swagger documentation
    "/api/auth/webhook", // Potential webhooks (if any)
  ];
  app.use(skipCSRFForRoutes(csrfSkipRoutes));

  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // === Rate Limiting ===
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: "Too many requests from this IP, please try again later.",
  });
  app.use(limiter);

  // === Routes ===
  const authRoutes = require("./routes/auth.js");
  const issueRoutes = require("./routes/issues");
  const profileRoutes = require("./routes/profileRoutes");
  const adminRoutes = require("./routes/admin");
  const contributionsRoutes = require("./routes/contributions.js");
  const notificationRoutes = require("./routes/notification");
  const pollRoutes = require("./routes/poll");
  const analyticsRoutes = require("./routes/analytics");
  const contactRoutes = require("./routes/contact");
  const postRoutes = require("./routes/posts"); // New Post Routes

  const moderatorRoutes = require("./routes/moderator");
  const gamificationRoutes = require("./routes/gamificationRoutes");

  // CSRF token endpoint
  app.get("/api/csrf-token", (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/issues", issueRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", analyticsRoutes);
  app.use("/api/contributions", contributionsRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/polls", pollRoutes);
  app.use("/api/posts", postRoutes); // Mount Post Routes
  app.use("/api/contact", contactRoutes);
  app.use("/api/lost-items", require("./routes/lostItem"));
  app.use("/api/moderator", moderatorRoutes);
  app.use("/api/gamification", gamificationRoutes);

  // === Swagger API Docs ===
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

  // === Error Handlers ===
  // CSRF Error Handler (must come before global error handler)
  app.use(csrfErrorHandler);

  // Global Error Handler
  const errorHandler = require("./middlewares/errorHandler.js");
  app.use(errorHandler);

  // === Socket.io Setup ===
  const http = require("http");
  const { Server } = require("socket.io");
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://civix-phi.vercel.app",
      ],
      methods: ["GET", "POST"],
      credentials: true
    },
  });

  let activeUsers = 0;

  io.on("connection", (socket) => {
    activeUsers++;
    io.emit("userCount", activeUsers);
    console.log(`User connected: ${socket.id}. Total: ${activeUsers}`);

    socket.on("sendMessage", (data) => {
      // Broadcast to everyone including sender (or use broadcast.emit for others only)
      io.emit("receiveMessage", data);
    });

    socket.on("disconnect", () => {
      activeUsers--;
      io.emit("userCount", activeUsers);
      console.log(`User disconnected: ${socket.id}. Total: ${activeUsers}`);
    });
  });

  // === Start Server ===
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`Server (HTTP + Socket.io) running at http://localhost:${PORT}`);
  });
}
