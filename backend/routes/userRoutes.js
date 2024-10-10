/**
 * @file userRoutes.js
 * @author TheWatcher01
 * @date 09-10-2024
 * @description This file contains the routes for user registration, login, and profile retrieval.
 */

const express = require('express'); // Import the express module to create an application framework.
const router = express.Router(); // Create a new router object.
const { registerUser, loginUser, getProfile } = require('../controllers/userController'); // Import user controller functions.
const verifyToken = require('../middlewares/authTokenMiddleware'); // Import middleware for verifying JWT.

/**
 * @route POST /register
 * @description Route for user registration.
 * This route allows new users to register by providing their username, email, and password.
 */
router.post('/register', registerUser); // Handle user registration requests.

/**
 * @route POST /login
 * @description Route for user login.
 * This route allows users to log in by providing their email and password.
 */
router.post('/login', loginUser); // Handle user login requests.

/**
 * @route GET /profile
 * @description Protected route for user profile retrieval.
 * This route retrieves the profile of the currently authenticated user.
 * It requires a valid JWT for access.
 */
router.get('/profile', verifyToken, getProfile); // Handle requests to get the user's profile.

module.exports = router; // Export the user routes for use in other parts of the application.
