/**
 * @file userController.js
 * @author TheWatcher01
 * @date 09-10-2024
 * @description This file contains user registration, login, and profile retrieval functions.
 */

const User = require('../models/User'); // Import the User model for database operations.
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing.
const jwt = require('jsonwebtoken'); // Import jsonwebtoken for generating JWTs.
const logger = require('../config/logger'); // Import logger for logging information and errors.

/**
 * @function registerUser
 * @description Registers a new user in the system by hashing the password and saving the user details in the database.
 * @param {Object} req - The request object containing user registration details.
 * @param {Object} res - The response object for sending responses to the client.
 * @returns {Promise<void>} A promise that resolves when the user is registered.
 */
const registerUser = async (req, res) => {
  const { username, email, password } = req.body; // Extract user details from the request body.
  try {
    const salt = await bcrypt.genSalt(10); // Generate a salt for password hashing.
    const hashedPassword = await bcrypt.hash(password, salt); // Hash the password with the generated salt.

    const user = new User({ username, email, password: hashedPassword }); // Create a new user instance.
    const savedUser = await user.save(); // Save the user to the database.
    logger.info(`User ${savedUser.username} registered successfully`); // Log successful registration.
    res.status(201).json({ message: 'User registered successfully', user: savedUser }); // Respond with success message and user data.
  } catch (err) {
    logger.error('Error during user registration:', err); // Log any errors encountered during registration.
    if (err.code === 11000) { // Check for duplicate key error.
      return res.status(400).json({ error: 'Username or email already exists' }); // Respond with error for existing user.
    }
    res.status(500).json({ error: 'Failed to register user. Please try again.' }); // Respond with generic error message.
  }
};

/**
 * @function loginUser
 * @description Authenticates a user by checking the email and password, and returns a JWT if successful.
 * @param {Object} req - The request object containing user login details.
 * @param {Object} res - The response object for sending responses to the client.
 * @returns {Promise<void>} A promise that resolves when the user is logged in.
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body; // Extract email and password from the request body.
  try {
    const user = await User.findOne({ email }); // Find the user by email.
    if (!user) return res.status(400).json({ error: 'User not found' }); // Respond if the user is not found.

    const validPassword = await bcrypt.compare(password, user.password); // Compare the provided password with the hashed password.
    if (!validPassword) return res.status(400).json({ error: 'Incorrect password' }); // Respond if the password is incorrect.

    const token = jwt.sign({ _id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION }); // Generate a JWT for the user.
    logger.info(`User ${email} logged in successfully`); // Log successful login.
    res.header('Authorization', token).json({ message: 'Login successful', token }); // Respond with the token.
  } catch (err) {
    logger.error('Error during user login:', err); // Log any errors encountered during login.
    res.status(500).json({ error: 'An error occurred during login. Please try again.' }); // Respond with generic error message.
  }
};

/**
 * @function getProfile
 * @description Retrieves the profile of the currently authenticated user.
 * @param {Object} req - The request object containing user authentication details.
 * @param {Object} res - The response object for sending responses to the client.
 * @returns {Promise<void>} A promise that resolves with the user's profile data.
 */
const getProfile = (req, res) => {
  res.json({ user: req.user }); // Respond with the authenticated user's profile data.
};

module.exports = { registerUser, loginUser, getProfile }; // Export the user controller functions for use in other parts of the application.
