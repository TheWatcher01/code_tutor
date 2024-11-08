/**
 * @file userController.js
 * @author TheWatcher01
 * @description Controller for user management with enhanced security and error handling
 * @date 2024-11-08
 */

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import backendLogger from "../config/backendLogger.js";
import { generateTokens, validateToken } from "../auth/jwtService.js";
import config from "../config/dotenvConfig.js";

// Validate password strength
const isPasswordValid = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasNonalphas
  );
};

// Register a new user
export const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    // Validate password strength
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        success: false,
        error: "Password does not meet security requirements",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error:
          existingUser.email === email
            ? "Email already registered"
            : "Username already taken",
      });
    }

    // Hash password with appropriate cost factor
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "student",
    });

    const savedUser = await user.save();

    // Generate tokens
    const tokens = generateTokens({
      id: savedUser._id,
      username: savedUser.username,
      role: savedUser.role,
    });

    // Set refresh token cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: config.REFRESH_TOKEN_EXPIRATION,
    });

    backendLogger.info(`User registered successfully: ${username}`);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: savedUser._id,
          username: savedUser.username,
          email: savedUser.email,
          role: savedUser.role,
        },
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    backendLogger.error("Registration error:", {
      error: error.message,
      stack: config.NODE_ENV === "development" ? error.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: "Registration failed. Please try again.",
    });
  }
};

// Login user
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    ); // Explicitly include password field

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate tokens
    const tokens = generateTokens({
      id: user._id,
      username: user.username,
      role: user.role,
    });

    // Set refresh token cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: config.REFRESH_TOKEN_EXPIRATION,
    });

    backendLogger.info(`User logged in: ${user.username}`);

    return res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        accessToken: tokens.accessToken,
      },
    });
  } catch (error) {
    backendLogger.error("Login error:", {
      error: error.message,
      stack: config.NODE_ENV === "development" ? error.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: "Login failed. Please try again.",
    });
  }
};

// Refresh access token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: "Refresh token not found",
      });
    }

    // Validate refresh token
    const decoded = await validateToken(refreshToken, "refresh");

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Generate new tokens
    const tokens = generateTokens({
      id: user._id,
      username: user.username,
      role: user.role,
    });

    // Set new refresh token cookie
    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: config.REFRESH_TOKEN_EXPIRATION,
    });

    return res.json({
      success: true,
      data: { accessToken: tokens.accessToken },
    });
  } catch (error) {
    backendLogger.error("Token refresh error:", {
      error: error.message,
      stack: config.NODE_ENV === "development" ? error.stack : undefined,
    });

    return res.status(401).json({
      success: false,
      error: "Token refresh failed",
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    return res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    backendLogger.error("Profile retrieval error:", {
      error: error.message,
      stack: config.NODE_ENV === "development" ? error.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: "Failed to retrieve profile",
    });
  }
};

export default {
  registerUser,
  loginUser,
  refreshToken,
  getProfile,
};
