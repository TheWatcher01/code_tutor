/**
 * @file dotenvConfig.js
 * @description Configuration system with validation and security features
 * @author TheWatcher01 (Enhanced by Claude)
 * @date 2024-11-08
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import backendLogger from "./backendLogger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Required variables
const REQUIRED_VARS = [
  "MONGODB_URI",
  "JWT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
];

// Secure default values
const DEFAULT_CONFIG = {
  PORT: 5001,
  NODE_ENV: "development",
  JWT_EXPIRATION: "1h",
  REFRESH_TOKEN_EXPIRATION: "7d",
  FRONTEND_URL: "http://localhost:5173",
  AUTH_ROUTES: "/api/auth",
  USER_ROUTES: "/api/users",
  COURSE_ROUTES: "/api/courses",
  COOKIE_MAX_AGE: 604800000,
  ALLOWED_ORIGINS: ["http://localhost:5173", "http://localhost:5001"],
};

/**
 * Generate a cryptographically secure secret
 */
const generateSecret = (bytes = 32) => {
  try {
    return crypto.randomBytes(bytes).toString("base64");
  } catch (error) {
    backendLogger.error("Failed to generate secret:", error);
    throw new Error("Failed to generate secure secret");
  }
};

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate configuration values
 */
const validateConfig = (config) => {
  // Check required variables
  REQUIRED_VARS.forEach((varName) => {
    if (!config[varName]) {
      throw new Error(`Required environment variable ${varName} is missing`);
    }
  });

  // Validate port
  if (isNaN(config.PORT) || config.PORT <= 0 || config.PORT > 65535) {
    throw new Error(`Invalid PORT: ${config.PORT}`);
  }

  // Validate MongoDB URI
  if (
    !config.MONGODB_URI.startsWith("mongodb://") &&
    !config.MONGODB_URI.startsWith("mongodb+srv://")
  ) {
    throw new Error("Invalid MONGODB_URI format");
  }

  // Validate URLs
  ["FRONTEND_URL", "GITHUB_CALLBACK_URL"].forEach((urlVar) => {
    if (config[urlVar] && !isValidUrl(config[urlVar])) {
      throw new Error(`Invalid URL for ${urlVar}: ${config[urlVar]}`);
    }
  });

  // Validate durations
  ["JWT_EXPIRATION", "REFRESH_TOKEN_EXPIRATION"].forEach((timeVar) => {
    const value = config[timeVar];
    if (!value.match(/^\d+[hdwmy]?$/)) {
      throw new Error(`Invalid time format for ${timeVar}: ${value}`);
    }
  });
};

/**
 * Load and validate configuration
 */
const loadAndValidateConfig = () => {
  try {
    // Load environment variables
    const envResult = dotenv.config({
      path: path.resolve(__dirname, "../.env"),
      debug: process.env.NODE_ENV === "development",
    });

    if (envResult.error) {
      throw new Error(`Failed to load .env file: ${envResult.error.message}`);
    }

    // Build the configuration
    const config = {
      // Base Configuration
      NODE_ENV: process.env.NODE_ENV || DEFAULT_CONFIG.NODE_ENV,
      PORT: parseInt(process.env.PORT || DEFAULT_CONFIG.PORT.toString(), 10),

      // Database
      MONGODB_URI: process.env.MONGODB_URI,

      // Authentication
      JWT_SECRET: process.env.JWT_SECRET || generateSecret(),
      REFRESH_TOKEN_SECRET:
        process.env.REFRESH_TOKEN_SECRET || generateSecret(),
      JWT_EXPIRATION:
        process.env.JWT_EXPIRATION || DEFAULT_CONFIG.JWT_EXPIRATION,
      REFRESH_TOKEN_EXPIRATION:
        process.env.REFRESH_TOKEN_EXPIRATION ||
        DEFAULT_CONFIG.REFRESH_TOKEN_EXPIRATION,

      // Session
      SESSION_SECRET: process.env.SESSION_SECRET || generateSecret(),

      // GitHub OAuth
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
      GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL,

      // URLs and Routes
      FRONTEND_URL: process.env.FRONTEND_URL || DEFAULT_CONFIG.FRONTEND_URL,
      AUTH_ROUTES: process.env.AUTH_ROUTES || DEFAULT_CONFIG.AUTH_ROUTES,
      USER_ROUTES: process.env.USER_ROUTES || DEFAULT_CONFIG.USER_ROUTES,
      COURSE_ROUTES: process.env.COURSE_ROUTES || DEFAULT_CONFIG.COURSE_ROUTES,

      // Security
      TOKEN_SECURE: process.env.NODE_ENV === "production",
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || "localhost",
      COOKIE_MAX_AGE: parseInt(
        process.env.COOKIE_MAX_AGE || DEFAULT_CONFIG.COOKIE_MAX_AGE.toString(),
        10
      ),

      // CORS Configuration
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
        : DEFAULT_CONFIG.ALLOWED_ORIGINS,
      CORS_METHODS: process.env.CORS_METHODS || "GET,POST,PUT,DELETE,OPTIONS",
      CORS_ALLOW_CREDENTIALS: process.env.CORS_ALLOW_CREDENTIALS || "true",
      CORS_MAX_AGE: process.env.CORS_MAX_AGE || "86400",
      CORS_ALLOWED_HEADERS: process.env.CORS_ALLOWED_HEADERS || "Content-Type,Authorization,X-Requested-With",

      // Additional Settings
      LOG_LEVEL:
        process.env.LOG_LEVEL ||
        (process.env.NODE_ENV === "development" ? "debug" : "info"),
      UPLOAD_PATH: path.resolve(__dirname, "../../uploads"),
      TEMP_PATH: path.resolve(__dirname, "../../temp"),
    };

    // Validate the configuration
    validateConfig(config);

    // Log sanitized configuration
    const sanitizedConfig = { ...config };
    [
      "JWT_SECRET",
      "REFRESH_TOKEN_SECRET",
      "SESSION_SECRET",
      "GITHUB_CLIENT_SECRET",
    ].forEach((key) => {
      if (sanitizedConfig[key]) {
        sanitizedConfig[key] = "[REDACTED]";
      }
    });

    backendLogger.info("Configuration loaded successfully", sanitizedConfig);

    // Return immutable configuration
    return Object.freeze(config);
  } catch (error) {
    backendLogger.error("Configuration error:", error);
    throw new Error(`Configuration failed: ${error.message}`);
  }
};

// Export the configuration
const config = loadAndValidateConfig();
export default config;

// Export utilities
export const configUtils = {
  generateSecret,
  isValidUrl,
  validateConfig,
};
