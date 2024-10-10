/**
 * @file dbConnection.js
 * @author TheWatcher01
 * @date 09-10-2024
 * @description This file contains the function to connect to MongoDB using Mongoose.
 */

const mongoose = require('mongoose'); // Import the mongoose module for MongoDB object modeling.
const logger = require('./logger'); // Import logger for logging connection status and errors.

/**
 * @function connectDB
 * @description Connects to the MongoDB database using the URI stored in the environment variables.
 * Logs the connection status and exits the process on failure.
 * @returns {Promise<void>} A promise that resolves when the connection is successful.
 */
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { // Attempt to connect to MongoDB.
      useNewUrlParser: true, // Use the new URL parser.
      useUnifiedTopology: true, // Use the unified topology for better connection management.
    });
    logger.info('Connected to MongoDB'); // Log successful connection to MongoDB.
  } catch (err) {
    logger.error('Error connecting to MongoDB', err); // Log any errors encountered during connection.
    process.exit(1); // Exit the process if the connection fails.
  }
};

module.exports = connectDB; // Export the connectDB function for use in other parts of the application.
