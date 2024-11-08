/**
 * @file backendLogger.js
 * @description Advanced Winston logger
 * @author TheWatcher01
 * @date 2024-11-08
 */

import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const { combine, timestamp, printf, errors, colorize, json } = format;

// Default configuration (without depending on dotenvConfig)
const DEFAULT_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || "development",
  LOG_LEVEL: process.env.LOG_LEVEL || "debug",
  LOG_PATH: process.env.LOG_PATH || "logs",
};

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Colors for different levels
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Custom format for development logs
const devLogFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let metaStr = "";
  if (Object.keys(metadata).length > 0) {
    if (metadata.stack) {
      metaStr = `\n${metadata.stack}`;
    } else {
      metaStr = `\n${JSON.stringify(metadata, null, 2)}`;
    }
  }
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

// Format for production logs
const prodLogFormat = combine(
  timestamp(),
  json(),
  format((info) => {
    info.env = DEFAULT_CONFIG.NODE_ENV;
    info.app = "code-tutor-backend";
    return info;
  })()
);

// Configuration for file rotation
const rotateOptions = {
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
  zippedArchive: true,
};

// Create base logger
const backendLogger = createLogger({
  level: DEFAULT_CONFIG.LOG_LEVEL,
  levels,
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    DEFAULT_CONFIG.NODE_ENV === "development" ? devLogFormat : prodLogFormat
  ),
  transports: [
    // Console transport
    new transports.Console({
      level: DEFAULT_CONFIG.NODE_ENV === "development" ? "debug" : "info",
      format: combine(
        colorize({ all: true }),
        DEFAULT_CONFIG.NODE_ENV === "development" ? devLogFormat : prodLogFormat
      ),
    }),
  ],
  exitOnError: false,
});

// Add file transports if not in test environment
if (DEFAULT_CONFIG.NODE_ENV !== "test") {
  const fileTransports = [
    // Error logs
    new DailyRotateFile({
      filename: path.join(DEFAULT_CONFIG.LOG_PATH, "error-%DATE%.log"),
      level: "error",
      ...rotateOptions,
      format: prodLogFormat,
    }),

    // Warning logs
    new DailyRotateFile({
      filename: path.join(DEFAULT_CONFIG.LOG_PATH, "warn-%DATE%.log"),
      level: "warn",
      ...rotateOptions,
      format: prodLogFormat,
    }),

    // Combined logs
    new DailyRotateFile({
      filename: path.join(DEFAULT_CONFIG.LOG_PATH, "combined-%DATE%.log"),
      ...rotateOptions,
      format: prodLogFormat,
    }),

    // HTTP logs
    new DailyRotateFile({
      filename: path.join(DEFAULT_CONFIG.LOG_PATH, "http-%DATE%.log"),
      level: "http",
      ...rotateOptions,
      format: prodLogFormat,
    }),
  ];

  fileTransports.forEach((transport) => backendLogger.add(transport));
}

// Handle exceptions and rejections
backendLogger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(DEFAULT_CONFIG.LOG_PATH, "exceptions-%DATE%.log"),
    ...rotateOptions,
    format: prodLogFormat,
  })
);

backendLogger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(DEFAULT_CONFIG.LOG_PATH, "rejections-%DATE%.log"),
    ...rotateOptions,
    format: prodLogFormat,
  })
);

// Sensitive information filter
const sanitizeFields = ["password", "token", "secret", "authorization"];
const sanitizeLog = (info) => {
  if (typeof info.message === "object") {
    const sanitized = { ...info.message };
    sanitizeFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    });
    info.message = sanitized;
  }
  return info;
};

backendLogger.format = combine(format(sanitizeLog)(), backendLogger.format);

// Utility methods
backendLogger.startProcess = (processName) => {
  backendLogger.info(`Process started: ${processName}`, {
    processName,
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
};

backendLogger.endProcess = (processName, duration) => {
  backendLogger.info(`Process completed: ${processName}`, {
    processName,
    duration,
    timestamp: new Date().toISOString(),
    pid: process.pid,
  });
};

// Memory monitoring (only in non-test environment)
if (DEFAULT_CONFIG.NODE_ENV !== "test") {
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    backendLogger.debug("Memory usage:", {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    });
  }, 300000);
}

// Method to update logger configuration
backendLogger.updateConfig = (newConfig) => {
  backendLogger.level = newConfig.LOG_LEVEL || DEFAULT_CONFIG.LOG_LEVEL;
  // Add any other configuration updates as needed
};

const sensitiveKeys = ['CLIENT_ID', 'API_KEY', 'TOKEN'];
const maskSensitiveData = (data) => {
  if (typeof data === 'object') {
    return Object.entries(data).reduce((acc, [key, value]) => {
      acc[key] = sensitiveKeys.some(sk => key.includes(sk)) ? '[REDACTED]' : value;
      return acc;
    }, {});
  }
  return data;
};

export default backendLogger;

export const logUtils = {
  startProcess: backendLogger.startProcess,
  endProcess: backendLogger.endProcess,
  levels,
  sanitizeFields,
  updateConfig: backendLogger.updateConfig,
};
