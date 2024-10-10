/**
 * @file githubAuth.js
 * @author TheWatcher01
 * @date 09-10-2024
 * @description This file contains the routes for GitHub authentication using Passport.js.
 */

const express = require('express'); // Import the express module to create an application framework.
const router = express.Router(); // Create a new router object.
const passport = require('passport'); // Import Passport.js for authentication.
const { Octokit } = require('@octokit/rest'); // Import Octokit to interact with GitHub's REST API.
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for creating and verifying JWTs.
const logger = require('../config/logger'); // Import logger for logging information and errors.

// Route for GitHub authentication
// This route initiates the GitHub authentication process.
router.get('/github', (req, res, next) => {
  logger.info('GitHub authentication initiated'); // Log the initiation of the authentication process.
  passport.authenticate('github')(req, res, next); // Start the authentication process with GitHub.
});

// Callback route after GitHub authentication
// This route handles the callback from GitHub after authentication.
// If authentication fails, it redirects to the login page.
// If authentication succeeds, it fetches the authenticated user's data from GitHub and redirects to the home page.
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }), // Handle the callback and redirect on failure.
  async (req, res) => {
    try {
      logger.info('GitHub authentication successful, fetching user data'); // Log successful authentication.
      const octokit = new Octokit({ auth: req.user.githubToken }); // Create an Octokit instance with the authenticated user's token.
      const { data } = await octokit.users.getAuthenticated(); // Fetch the authenticated user's data from GitHub.
      logger.info('GitHub user data retrieved:', data); // Log the retrieved user data.
      res.redirect('/'); // Redirect to the home page after successful data retrieval.
    } catch (error) {
      logger.error('Error fetching GitHub user data:', error); // Log any errors encountered during data retrieval.
      res.redirect('/login'); // Redirect to the login page on error.
    }
  }
);

module.exports = router; // Export the router for use in other parts of the application.
