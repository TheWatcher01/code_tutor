/**
 * @file server.js
 * @description Enhanced server configuration with security and monitoring
 * @author TheWatcher01
 * @date 2024-11-08
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import mongoose from "mongoose";
import config from "./config/dotenvConfig.js";
import connectDB, { dbUtils } from "./config/dbConnexion.js";
import backendLogger from "./config/backendLogger.js";
import passport from "./auth/githubService.js";
import sessionMiddleware from "./middlewares/sessionMiddleware.js";
import authRoutes from "./auth/routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Security Middleware Configuration
app.use(
  helmet({
    contentSecurityPolicy: config.NODE_ENV === "production",
    crossOriginEmbedder: true,
    crossOriginOpener: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: config.NODE_ENV === "production",
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true,
  })
);

// Rate Limiting Configuration
const limiter = rateLimit({
  windowMs: parseInt(config.RATE_LIMIT_WINDOW),
  max: parseInt(config.RATE_LIMIT_MAX),
  message: { error: config.RATE_LIMIT_MESSAGE },
  skip: (req) => config.RATE_LIMIT_SKIP_TRUSTED && req.ip === "127.0.0.1",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS Configuration
app.use(
  cors({
    origin: config.ALLOWED_ORIGINS,
    methods: config.CORS_METHODS.split(","),
    credentials: config.CORS_ALLOW_CREDENTIALS === "true",
    maxAge: parseInt(config.CORS_MAX_AGE),
    allowedHeaders: config.CORS_ALLOWED_HEADERS.split(","),
    exposedHeaders: ["Content-Range", "X-Content-Range"],
  })
);

// Basic Middleware Setup
app.use(express.json({ limit: config.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: config.BODY_LIMIT }));

app.use(
  compression({
    level: parseInt(config.COMPRESSION_LEVEL),
    threshold: parseInt(config.COMPRESSION_THRESHOLD),
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Development Logging
if (config.NODE_ENV === "development" && config.ENABLE_MORGAN === "true") {
  app.use(
    morgan("dev", {
      stream: {
        write: (message) => backendLogger.http(message.trim()),
      },
    })
  );
}

// Database Initialization
const initializeDB = async () => {
  try {
    await connectDB();
    backendLogger.info("Database connection established");
  } catch (err) {
    backendLogger.error("Database initialization failed:", {
      error: err.message,
      stack: config.NODE_ENV === "development" ? err.stack : undefined,
    });
    process.exit(1);
  }
};

// Directory Structure Setup
const createRequiredDirectories = () => {
  const directories = {
    uploads: path.join(__dirname, "../uploads"),
    temp: path.join(__dirname, "../temp"),
    logs: path.join(__dirname, "../logs"),
    cache: path.join(__dirname, "../cache"),
    public: path.join(__dirname, "../public"),
  };

  Object.entries(directories).forEach(([name, dir]) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      backendLogger.info(`Created ${name} directory: ${dir}`);
    }
  });
};

// Initialize API routes with proper error handling
const initializeRoutes = () => {
  backendLogger.info("Initializing API routes...");

  // Remove /api from route paths if they already include it
  const authPath = config.AUTH_ROUTES?.replace('/api', '') || '/auth';
  const userPath = config.USER_ROUTES?.replace('/api', '') || '/users';
  const coursePath = config.COURSE_ROUTES?.replace('/api', '') || '/courses';
  const healthPath = config.HEALTH_CHECK_PATH || '/health';
  const metricsPath = config.METRICS_PATH || '/metrics';

  // API prefix (ensure single /api)
  const apiPrefix = config.API_PREFIX || '/api';

  // Mount routes
  app.use(`${apiPrefix}${authPath}`, authRoutes);
  app.use(`${apiPrefix}${userPath}`, userRoutes);
  app.use(`${apiPrefix}${coursePath}`, courseRoutes);

  // Health and Metrics endpoints...
  if (config.ENABLE_HEALTH_CHECK !== "false") {
    app.get(`${apiPrefix}${healthPath}`, async (req, res) => {
      try {
        const dbHealth = await dbUtils.checkHealth();
        const health = {
          status: "healthy",
          timestamp: new Date().toISOString(),
          environment: config.NODE_ENV,
          database: dbHealth,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        };
        res.json(health);
      } catch (error) {
        res.status(503).json({
          status: "unhealthy",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  if (config.ENABLE_METRICS === "true") {
    app.get(`${apiPrefix}${metricsPath}`, async (req, res) => {
      const metrics = {
        timestamp: new Date().toISOString(),
        process: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
        },
        database: await dbUtils.getMetrics(),
      };
      res.json(metrics);
    });
  }

  backendLogger.info("API routes initialized successfully", {
    routes: {
      auth: `${apiPrefix}${authPath}`,
      users: `${apiPrefix}${userPath}`,
      courses: `${apiPrefix}${coursePath}`,
      health: `${apiPrefix}${healthPath}`,
      metrics: `${apiPrefix}${metricsPath}`,
    },
  });
};

// Initialize Server
const initializeServer = async () => {
  try {
    // Initialize database first
    await initializeDB();

    // Create required directories
    createRequiredDirectories();

    // Session and Authentication setup
    app.use(sessionMiddleware);
    app.use(passport.initialize());
    app.use(passport.session());

    // Initialize API routes
    initializeRoutes();

    // Static files and SPA setup
    const frontendPublicPath = path.join(__dirname, "..", config.FRONTEND_PATH || "frontend1", "public");
    if (!fs.existsSync(frontendPublicPath)) {
      fs.mkdirSync(frontendPublicPath, { recursive: true });
      backendLogger.info(`Created frontend public directory: ${frontendPublicPath}`);
    }

    app.use(express.static(frontendPublicPath, {
      maxAge: "1d",
      etag: true,
      lastModified: true,
    }));

    // SPA Fallback - must be after API routes
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(frontendPublicPath, "index.html"), (err) => {
          if (err) {
            backendLogger.error("Error serving index.html:", err);
            res.status(500).send("Error loading application");
          }
        });
      } else {
        res.status(404).json({ error: "API route not found" });
      }
    });

    // Global Error Handler
    app.use((err, req, res, next) => {
      backendLogger.error("Server error:", {
        error: err.message,
        stack: config.NODE_ENV === "development" ? err.stack : undefined,
        path: req.path,
        method: req.method,
      });

      res.status(err.status || 500).json({
        error:
          config.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
        requestId: req.requestId,
      });
    });

    // Start Server
    const server = app.listen(config.PORT, () => {
      backendLogger.info(
        `Server running on port ${config.PORT} in ${config.NODE_ENV} mode`
      );
      backendLogger.info(`Frontend URL: ${config.FRONTEND_URL}`);
    });

    // Graceful Shutdown
    const gracefulShutdown = async (signal) => {
      backendLogger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        try {
          await mongoose.connection.close();
          backendLogger.info("Server shutdown completed");
          process.exit(0);
        } catch (err) {
          backendLogger.error("Error during shutdown:", err);
          process.exit(1);
        }
      });

      // Force shutdown after timeout
      setTimeout(() => {
        backendLogger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 30000); // 30 seconds timeout
    };

    // Shutdown Handlers
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Unhandled Rejection Handler
    process.on("unhandledRejection", (reason, promise) => {
      backendLogger.error("Unhandled Rejection:", {
        reason,
        promise,
        stack: reason.stack,
      });
    });

    // Uncaught Exception Handler
    process.on("uncaughtException", (error) => {
      backendLogger.error("Uncaught Exception:", {
        error: error.message,
        stack: error.stack,
      });
      gracefulShutdown("Uncaught Exception");
    });
  } catch (error) {
    backendLogger.error("Server initialization failed:", error);
    process.exit(1);
  }
};

// Initialize the server
initializeServer();

export default app;
