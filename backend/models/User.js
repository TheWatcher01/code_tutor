/**
 * @file User.js
 * @author TheWatcher01
 * @date 08-10-2024
 * @description Defines the User model for MongoDB, representing users in the application, including GitHub OAuth data.
 */

const mongoose = require('mongoose'); // Import Mongoose to define schema and interact with MongoDB

// Define the schema for the User collection
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true, // Username is required
    unique: true, // Ensure each username is unique
  },
  email: {
    type: String,
    required: true, // Email is required
    unique: true, // Ensure each email is unique
  },
  password: {
    type: String,
    required: true, // Password is required and will be stored hashed
  },
  role: {
    type: String,
    enum: ['student', 'mentor', 'admin'], // User role must be one of these values
    default: 'student', // Default role is 'student' if not specified
  },
  githubId: {
    type: String, // Optional field for GitHub ID when using GitHub authentication
    unique: true,
  },
  githubLogin: {
    type: String, // GitHub login username returned by GitHub OAuth
  },
  githubProfileUrl: {
    type: String, // URL of the GitHub profile (html_url) returned by GitHub API
  },
  githubToken: {
    type: String, // Optional field to store GitHub token for API interactions
  },
}, { timestamps: true }); // Automatically add createdAt and updatedAt timestamps

// Create and export the User model using the schema
module.exports = mongoose.model('User', UserSchema);
