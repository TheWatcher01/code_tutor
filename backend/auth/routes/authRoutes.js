/**
 * @file authRoutes.js
 * @description Main authentication routes with GitHub integration
 * @author TheWatcher01
 * @date 2024-11-12
 */

import express from "express";
import crypto from "crypto";
import githubRoutes from "./githubRoutes.js";
import { verifyToken } from "../authMiddleware.js";
import backendLogger from "../../config/backendLogger.js";
import config from "../../config/dotenvConfig.js";

const router = express.Router();

// Simple request logging
const logAuthRequest = (req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;

  backendLogger.debug("Auth route accessed:", {
    requestId,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers["user-agent"]?.substring(0, 100),
  });

  next();
};

// Apply logging middleware
router.use(logAuthRequest);

// Mount GitHub routes
router.use("/github", githubRoutes);

// Authentication status check
router.get("/status", verifyToken, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ isAuthenticated: false });
  }

  res.json({
    isAuthenticated: true,
    user: req.user,
  });
});

// Logout route
router.post("/logout", verifyToken, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      backendLogger.error("Session destruction failed:", err);
      return res.status(500).json({ error: "Logout failed" });
    }

    // Clear cookies
    res.clearCookie("code_tutor.sid", { path: "/" });
    res.clearCookie("refreshToken", { path: "/" });
    res.clearCookie("connect.sid", { path: "/" });

    res.json({ message: "Logged out successfully" });
  });
});

// Basic error handler
router.use((err, req, res, next) => {
  backendLogger.error("Auth route error:", {
    error: err.message,
    requestId: req.requestId,
  });

  res.status(err.status || 500).json({
    error:
      config.NODE_ENV === "development" ? err.message : "Authentication error",
  });
});

export default router;
