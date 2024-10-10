/**
 * @file Course.js
 * @author TheWatcher01
 * @date 08-10-2024
 * @description Defines the Course model for MongoDB, representing course data in the application.
 */

const mongoose = require('mongoose'); // Import Mongoose to define the schema and model

// Define the schema for the Course collection
const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // Title is required
  },
  description: {
    type: String,
    required: true, // Description is required
  },
  content: {
    type: String,
    required: true, // Content of the course is required (can be text, HTML, etc.)
  },
  audioURL: {
    type: String, // Optional field for storing a URL to the course audio
  },
  pdfURL: {
    type: String, // Optional field for storing a URL to the course PDF
  },
  videoURL: {
    type: String, // Optional field for storing a URL to the course video
  },
}, { timestamps: true }); // Automatically add createdAt and updatedAt fields

// Create the Course model using the schema
const Course = mongoose.model('Course', CourseSchema);

module.exports = Course; // Export the model for use in CourseRoutes.js
