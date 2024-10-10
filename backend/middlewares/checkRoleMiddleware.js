/**
 * @file checkRoleMiddleware.js
 * @author TheWatcher01
 * @date 09-10-2024
 * @description This file contains middleware for verifying user roles based on JWT.
 */

const jwt = require('jsonwebtoken'); // Import jsonwebtoken for verifying tokens.
const logger = require('../config/logger'); // Import logger for logging information and errors.

/**
 * @function verifyRole
 * @description Middleware function that verifies the user's role based on the JWT provided in the request header.
 * If the role is valid, it adds the user information to the request object and proceeds to the next middleware.
 * If the role is invalid or the token is missing, it responds with an error message.
 * @param {Array<string>} roles - The list of valid roles for accessing the route.
 * @returns {Function} A middleware function that verifies the user's role.
 */
const verifyRole = (roles) => {
  return (req, res, next) => {
    const token = req.header('Authorization'); // Get the token from the Authorization header.
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' }); // Respond with access denied error if no token is provided.

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET); // Verify the token using the JWT secret.
      if (!roles.includes(verified.role)) { // Check if the user's role is valid.
        return res.status(403).json({ error: 'Access denied. Invalid role.' }); // Respond with access denied error if the role is invalid.
      }
      req.user = verified; // Add the verified user information to the request object.
      next(); // Call the next middleware function.
    } catch (err) {
      logger.error('Access denied: Invalid token', err); // Log any errors encountered during token verification.
      return res.status(401).json({ error: 'Access denied. Invalid token.' }); // Respond with an invalid token error.
    }
  };
};

module.exports = verifyRole; // Export the verifyRole middleware for use in other parts of the application.
