/**
 * @file checkRoleMiddleware.js
 * @description Enhanced role-based access control middleware
 * @author TheWatcher01
 * @date 2024-11-08
 */

import jwt from "jsonwebtoken";
import backendLogger from "../config/backendLogger.js";
import config from "../config/dotenvConfig.js";

// Role hierarchy definition
const ROLE_HIERARCHY = {
  admin: ["admin", "mentor", "student"],
  mentor: ["mentor", "student"],
  student: ["student"],
};

// Validate if a role has access to required roles
const hasRequiredRole = (userRole, requiredRoles) => {
  if (!userRole || !ROLE_HIERARCHY[userRole]) return false;
  return requiredRoles.some((role) => ROLE_HIERARCHY[userRole].includes(role));
};

// Create middleware for role-based access control
export const verifyRole = (roles) => {
  // Convert single role to array
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        backendLogger.warn("Role verification failed: No bearer token", {
          path: req.path,
          ip: req.ip,
        });

        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const token = authHeader.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, config.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: config.JWT_ISSUER,
        audience: config.JWT_AUDIENCE,
      });

      // Check if token contains role information
      if (!decoded.role) {
        backendLogger.warn("Role verification failed: No role in token", {
          userId: decoded.id,
        });

        return res.status(403).json({
          success: false,
          error: "Invalid token: no role specified",
        });
      }

      // Verify role access
      if (!hasRequiredRole(decoded.role, requiredRoles)) {
        backendLogger.warn(
          "Role verification failed: Insufficient privileges",
          {
            userId: decoded.id,
            userRole: decoded.role,
            requiredRoles,
          }
        );

        return res.status(403).json({
          success: false,
          error: "Insufficient privileges",
        });
      }

      // Add user info to request
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        permissions: ROLE_HIERARCHY[decoded.role],
      };

      backendLogger.debug("Role verification successful", {
        userId: decoded.id,
        role: decoded.role,
        path: req.path,
      });

      next();
    } catch (error) {
      backendLogger.error("Role verification error:", {
        error: error.message,
        stack: config.NODE_ENV === "development" ? error.stack : undefined,
      });

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token expired",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          error: "Invalid token",
        });
      }

      res.status(500).json({
        success: false,
        error: "Role verification failed",
      });
    }
  };
};

// Middleware for checking specific permissions
export const checkPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user?.permissions) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    const hasPermission = permissions.every((permission) =>
      req.user.permissions.includes(permission)
    );

    if (!hasPermission) {
      backendLogger.warn("Permission check failed", {
        userId: req.user.id,
        required: permissions,
        actual: req.user.permissions,
      });

      return res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      });
    }

    next();
  };
};

export default {
  verifyRole,
  checkPermissions,
  ROLE_HIERARCHY,
};
