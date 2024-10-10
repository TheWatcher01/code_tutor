/**
 * @file logger.js
 * @author TheWatcher01
 * @date 09-10-2024
 * @description This file configures and exports a Winston logger for logging application events.
 */

const { createLogger, format, transports } = require('winston'); // Import the necessary modules from the winston library.
const { combine, timestamp, printf, errors } = format; // Destructure the format functions from winston.

/**
 * @function logFormat
 * @description Formats log messages with a timestamp and level.
 * @param {Object} param0 - The log message parameters.
 * @param {string} param0.level - The log level (e.g., info, error).
 * @param {string} param0.message - The log message.
 * @param {string} param0.timestamp - The timestamp of the log entry.
 * @param {string} param0.stack - The stack trace if available.
 * @returns {string} The formatted log message.
 */
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`; // Return the formatted string for the log entry.
});

// Create a logger instance with specified configurations.
const logger = createLogger({
  level: 'info', // Set the default log level to info.
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Format the timestamp.
    errors({ stack: true }), // Include stack traces for errors.
    logFormat // Use the custom log format.
  ),
  transports: [
    new transports.Console(), // Log messages to the console.
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // Log error messages to a file.
    new transports.File({ filename: 'logs/combined.log' }), // Log all messages to a combined log file.
  ],
});

module.exports = logger; // Export the configured logger for use in other parts of the application.
