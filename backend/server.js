/**
 * @file server.js
 * @author TheWatcher01
 * @date 09-10-2024
 * @description This file sets up the Express server, connects to the database, and defines API routes.
 */

const express = require('express'); // Import the express module to create an application framework.
const dotenv = require('dotenv'); // Import dotenv to load environment variables from a .env file.
const connectDB = require('./config/dbConnexion'); // Import the database connection function.
const cors = require('cors'); // Import cors for enabling Cross-Origin Resource Sharing.
const logger = require('./config/logger'); // Import logger for logging server events.

dotenv.config(); // Load environment variables from .env file.

connectDB(); // Establish a connection to the database.

const app = express(); // Create an instance of the Express application.

/**
 * @function middlewareSetup
 * @description Sets up middleware for the Express application, including JSON parsing and CORS.
 */
app.use(express.json()); // Middleware to parse JSON request bodies.
app.use(cors()); // Middleware to enable CORS for all routes.

/**
 * @function routeSetup
 * @description Sets up API routes for user management, course management, and GitHub authentication.
 */
app.use('/api/users', require('./routes/userRoutes')); // User routes.
app.use('/api/courses', require('./routes/courseRoutes')); // Course routes.
app.use('/api/auth', require('./routes/githubAuth')); // GitHub authentication routes.

const PORT = process.env.PORT || 5001; // Define the port to run the server on.
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`); // Log the server start event.
});
