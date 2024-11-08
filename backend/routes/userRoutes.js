/**
 * @file userRoutes.js
 * @description User routes with enhanced security and logging
 * @author TheWatcher01
 * @date 2024-11-08
 */

import express from "express";
import { verifyToken } from "../auth/authMiddleware.js";
import {
  registerUser,
  loginUser,
  getProfile,
} from "../controllers/userController.js";
import backendLogger from "../config/backendLogger.js";

const router = express.Router();

// Log middleware for user routes
const logUserRequest = (req, res, next) => {
  backendLogger.debug("User route accessed:", {
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  next();
};

// Apply logging to all user routes
router.use(logUserRequest);

// Register a new user
router.post(
  "/register",
  (req, res, next) => {
    backendLogger.info("User registration initiated", {
      email: req.body.email,
      username: req.body.username,
    });
    next();
  },
  registerUser
);

// Authenticate user and return tokens
router.post(
  "/login",
  (req, res, next) => {
    backendLogger.info("User login attempted", {
      email: req.body.email,
    });
    next();
  },
  loginUser
);

// Get authenticated user's profile
router.get(
  "/profile",
  verifyToken,
  (req, res, next) => {
    backendLogger.info("Profile retrieval", {
      userId: req.user?.id,
    });
    next();
  },
  getProfile
);

// Error handling middleware for user routes
router.use((err, req, res, next) => {
  backendLogger.error("User route error:", {
    error: err.message,
    path: req.path,
    method: req.method,
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

export default router;
