/**
 * @file authMiddleware.js
 * @description Authentication middleware with enhanced security and error handling
 * @author TheWatcher01
 * @date 2024-11-08
 */

import jwt from "jsonwebtoken";
import backendLogger from "../config/backendLogger.js";
import config from "../config/dotenvConfig.js";

// Auth error types
const AUTH_ERRORS = {
  NO_TOKEN: "Access denied. No Authorization header.",
  INVALID_FORMAT: "Access denied. Invalid Authorization format.",
  EMPTY_TOKEN: "Access denied. Empty token.",
  EXPIRED: "Token expired. Please log in again.",
  INVALID: "Authentication failed. Please log in again.",
  INTERNAL: "Internal server error during authentication.",
};

// Extract and validate token from Authorization header
const extractToken = (authHeader) => {
  if (!authHeader) {
    return { isValid: false, error: AUTH_ERRORS.NO_TOKEN };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { isValid: false, error: AUTH_ERRORS.INVALID_FORMAT };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return { isValid: false, error: AUTH_ERRORS.EMPTY_TOKEN };
  }

  return { isValid: true, token };
};

// Verify JWT token and attach user data to request
const verifyToken = (req, res, next) => {
  try {
    backendLogger.debug("Auth request received:", {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers["user-agent"]?.substring(0, 100),
    });

    const { isValid, token, error } = extractToken(req.headers.authorization);
    if (!isValid) {
      backendLogger.warn("Token extraction failed:", { error });
      return res.status(401).json({
        success: false,
        error,
      });
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ["HS256"],
        maxAge: config.JWT_EXPIRATION,
        audience: config.JWT_AUDIENCE || "code-tutor-api",
        issuer: config.JWT_ISSUER || "code-tutor",
      });

      if (!decoded.id || !decoded.username) {
        throw new Error("Invalid token structure");
      }

      backendLogger.debug("Token verified:", {
        userId: decoded.id,
        username: decoded.username,
        exp: decoded.exp
          ? new Date(decoded.exp * 1000).toISOString()
          : "No expiration",
        iat: decoded.iat
          ? new Date(decoded.iat * 1000).toISOString()
          : "No issue date",
      });

      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role || "user",
        tokenExp: decoded.exp,
      };

      // Token expiration check
      const expiresIn = decoded.exp * 1000 - Date.now();
      if (expiresIn < 300000) {
        backendLogger.warn("Token expires soon:", {
          userId: decoded.id,
          expiresIn: Math.floor(expiresIn / 1000),
        });
        res.setHeader("X-Token-Expires-Soon", "true");
      }

      next();
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        backendLogger.warn("Token expired:", {
          expiredAt: jwtError.expiredAt,
          now: new Date().toISOString(),
        });
        return res.status(401).json({
          success: false,
          error: AUTH_ERRORS.EXPIRED,
          expiredAt: jwtError.expiredAt,
        });
      }

      backendLogger.error("JWT validation failed:", {
        name: jwtError.name,
        message: jwtError.message,
        token: token.substring(0, 10) + "...",
      });

      return res.status(401).json({
        success: false,
        error: AUTH_ERRORS.INVALID,
      });
    }
  } catch (error) {
    backendLogger.error("Critical auth error:", {
      type: error.name,
      message: error.message,
      stack: config.NODE_ENV === "development" ? error.stack : undefined,
    });

    return res.status(500).json({
      success: false,
      error: AUTH_ERRORS.INTERNAL,
      details: config.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Create middleware function that combines token verification and role checking
const authMiddleware = {
  verifyToken,
  requireRoles: (roles) => {
    return [
      verifyToken,
      (req, res, next) => {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: "Authentication required",
          });
        }

        if (!roles.includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            error: "Insufficient privileges",
          });
        }

        next();
      },
    ];
  },
};

// Exports
export { verifyToken, extractToken, AUTH_ERRORS };
export default authMiddleware;
