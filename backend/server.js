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

  // Trust proxy for Render/Vercel (fixes express-rate-limit error)
  app.set('trust proxy', 1);

  // === Database Initialization ===

  // Commented db.js import so that the app can run on MongoDB only to rectify the issue of multiple database connections

  // require("./config/db.js");     // PostgreSQL
  require("./config/mongo.js"); // MongoDB

  // === Swagger Docs ===
  const { swaggerUi, specs } = require("./config/swagger.js");

  // === Middlewares ===
  // === Middlewares ===
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://localhost:5173",
    "https://civix-phi.vercel.app", // Keeping old one just in case
    "https://civix-plus.vercel.app", // Current Production
    process.env.FRONTEND_URL, // Dynamic
  ].filter(Boolean); // Remove empty if env var missing

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // ... (lines 87-156 skipped in thought, but included in tool execution context implicitly via line ranges if careful, or just replace the blocks)
  // To avoid messing up large chunks, I will do two replaces or one big one.
  // The file is small enough to risk a larger replace if I am careful. 
  // But wait, the socket.io part is further down.
  // I'll effectively replace the first block now, and the socket.io block in a second tool call or rely on the user to re-read. 
  // Actually, I can use the same allowedOrigins variable if I declare it wide scope, but I can't easily do that with tool constraints effectively.
  // Using two replaces is safer.

  // NOTE: I am ONLY replacing the first cors block here.


  // === Security Middlewares ===
  // Global XSS Sanitization
  app.use(xssSanitizer);

  // CSRF Protection (skip for certain routes)
  // CSRF Protection (skip for certain routes)
  const csrfSkipRoutes = [
    "/api-docs", // Swagger documentation
    "/api/auth/webhook", // Potential webhooks
    "/api/issues/analyze-image", // AI Image Analysis (Multipart)
    "/api/issues/generate-caption", // AI Caption (Multipart)
  ];
  app.use(skipCSRFForRoutes(csrfSkipRoutes));

  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // === Rate Limiting ===
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for dev/testing
    message: "Too many requests from this IP, please try again later.",
  });
  app.use(limiter);

  // === Routes ===
  const authRoutes = require("./routes/auth.js");
  const chatRoutes = require('./routes/chatRoutes');
  const issueRoutes = require("./routes/issues");
  const profileRoutes = require("./routes/profileRoutes");
  const adminRoutes = require("./routes/admin");
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
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/polls", pollRoutes);
  app.use("/api/posts", postRoutes); // Mount Post Routes
  app.use("/api/communities", require("./routes/community"));
  app.use("/api/contact", contactRoutes);
  app.use("/api/lost-items", require("./routes/lostItem"));
  app.use("/api/moderator", moderatorRoutes);
  app.use("/api/ai", require("./routes/aiRoutes"));
  app.use("/api/gamification", gamificationRoutes);
  app.use("/api/ml", require("./routes/mlProxy")); // ML Service Proxy

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
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:5173",
        "https://civix-phi.vercel.app",
        "https://civix-plus.vercel.app",
        process.env.FRONTEND_URL
      ].filter(Boolean),
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
