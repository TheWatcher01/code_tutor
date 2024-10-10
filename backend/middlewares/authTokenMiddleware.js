/**
 * @file authTokenMiddleware.js
 * @author TheWatcher01
 * @date 09-10-2024
 * @description This file contains middleware for verifying JSON Web Tokens (JWT).
 */

const jwt = require('jsonwebtoken'); // Import jsonwebtoken for verifying tokens.
const logger = require('../config/logger'); // Import logger for logging information and errors.

/**
 * @function verifyToken
 * @description Middleware function that verifies the JWT provided in the request header.
 * If the token is valid, it adds the user information to the request object and proceeds to the next middleware.
 * If the token is invalid or missing, it responds with an error message.
 * @param {Object} req - The request object containing the JWT in the Authorization header.
 * @param {Object} res - The response object for sending responses to the client.
 * @param {Function} next - The next middleware function to call if the token is valid.
 * @returns {Promise<void>} A promise that resolves when the token is verified.
 */
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization'); // Get the token from the Authorization header.
  if (!token) {
    logger.warn('Access denied: No token provided'); // Log warning if no token is provided.
    return res.status(401).json({ error: 'Access denied. No token provided.' }); // Respond with access denied error.
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET); // Verify the token using the JWT secret.
    req.user = verified; // Add the verified user information to the request object.
    next(); // Call the next middleware function.
  } catch (err) {
    logger.error('Invalid token', err); // Log any errors encountered during token verification.
    res.status(400).json({ error: 'Invalid token' }); // Respond with an invalid token error.
  }
};

module.exports = verifyToken; // Export the verifyToken middleware for use in other parts of the application.
