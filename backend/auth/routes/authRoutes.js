/**
 * @file authRoutes.js
 * @description Enhanced authentication routes with better security and error handling
 * @author TheWatcher01
 * @date 2024-11-08
 */

import express from "express";
import rateLimit from "express-rate-limit";
import githubRoutes from "./githubRoutes.js";
import { verifyToken } from "../authMiddleware.js";
import { validateToken, revokeToken } from "../jwtService.js";
import backendLogger from "../../config/backendLogger.js";
import config from "../../config/dotenvConfig.js";

const router = express.Router();

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // Use IP for rate limiting
});

// Logging middleware with request tracking
const logAuthRequest = (req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;

  backendLogger.debug("Auth route accessed:", {
    requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"]?.substring(0, 100),
    timestamp: new Date().toISOString(),
  });

  // Log response time
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    backendLogger.debug("Auth request completed:", {
      requestId,
      duration,
      statusCode: res.statusCode,
    });
  });

  next();
};

// Apply middleware
router.use(authLimiter);
router.use(logAuthRequest);

// GitHub authentication routes
router.use("/github", githubRoutes);

// Route to get authentication status
router.get("/status", verifyToken, async (req, res) => {
  try {
    if (!req.user) {
      throw new Error("No user found in request");
    }

    res.json({
      success: true,
      data: {
        isAuthenticated: true,
        user: req.user,
        sessionId: req.sessionID,
      },
    });
  } catch (error) {
    backendLogger.error("Auth status error:", {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(401).json({
      success: false,
      error: "Authentication failed",
    });
  }
});

// Route for logout with token revocation
router.post("/logout", verifyToken, async (req, res) => {
  try {
    // Destruction de la session
    req.session.destroy((err) => {
      if (err) {
        throw new Error("Session destruction failed");
      }
      
      // Clear all auth-related cookies
      const cookieOptions = {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        domain: config.COOKIE_DOMAIN,
        path: '/',
      };

      res.clearCookie("code_tutor.sid", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      res.clearCookie("connect.sid", cookieOptions);

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    });
  } catch (error) {
    backendLogger.error("Logout error:", {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: "Logout failed",
    });
  }
});

// Health check route with detailed status
router.get("/health", async (req, res) => {
  try {
    const status = {
      service: "authentication",
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    backendLogger.error("Health check error:", {
      error: error.message,
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: "Health check failed",
    });
  }
});

// Development routes
if (config.NODE_ENV === "development") {
  router.get("/test", (req, res) => {
    backendLogger.debug("Test route accessed", {
      requestId: req.requestId,
    });

    res.json({
      success: true,
      message: "Auth routes working",
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });
}

// Global error handler for auth routes
router.use((err, req, res, next) => {
  backendLogger.error("Auth route error:", {
    error: err.message,
    stack: config.NODE_ENV === "development" ? err.stack : undefined,
    requestId: req.requestId,
  });

  res.status(err.status || 500).json({
    success: false,
    error:
      config.NODE_ENV === "development"
        ? err.message
        : "Internal authentication error",
  });
});

// Ajout de la route de vérification d'état GitHub
router.get("/github/state", (req, res) => {
  const state = req.session.githubState;
  if (!state) {
    return res.status(401).json({
      success: false,
      error: "Invalid state",
    });
  }
  res.json({ success: true, state });
});

export default router;
