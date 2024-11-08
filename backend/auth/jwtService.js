/**
 * @file jwtService.js
 * @author TheWatcher01
 * @date 07-11-2024
 * @description Service for JWT management with enhanced security
 */

import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../config/dotenvConfig.js";
import backendLogger from "../config/backendLogger.js";

// Constants for token types
const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
};

// Cache of revoked tokens
const revokedTokens = new Set();


const generateTokenId = () => crypto.randomBytes(16).toString("hex");


const validateUserData = (user) => {
  if (!user?.id && !user?._id) {
    throw new Error("User ID is required");
  }
  if (!user?.username) {
    throw new Error("Username is required");
  }
};


const generateTokens = (user) => {
  try {
    validateUserData(user);

    const tokenId = generateTokenId();
    const userId = user.id || user._id;

    // Generate the access token
    const accessToken = jwt.sign(
      {
        jti: tokenId,
        id: userId,
        username: user.username,
        email: user.email,
        role: user.role || "user",
        type: TOKEN_TYPES.ACCESS,
      },
      config.JWT_SECRET,
      {
        expiresIn: config.JWT_EXPIRATION,
        algorithm: "HS256",
        audience: config.JWT_AUDIENCE || "code-tutor-api",
        issuer: config.JWT_ISSUER || "code-tutor",
      }
    );

    // Generate the refresh token
    const refreshToken = jwt.sign(
      {
        jti: generateTokenId(),
        id: userId,
        tokenId, // Link to the access token
        type: TOKEN_TYPES.REFRESH,
      },
      config.REFRESH_TOKEN_SECRET,
      {
        expiresIn: config.REFRESH_TOKEN_EXPIRATION,
        algorithm: "HS256",
        audience: config.JWT_AUDIENCE || "code-tutor-api",
        issuer: config.JWT_ISSUER || "code-tutor",
      }
    );

    backendLogger.info("Tokens generated successfully", {
      userId,
      tokenId,
      type: TOKEN_TYPES.ACCESS,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(config.JWT_EXPIRATION),
      tokenType: "Bearer",
    };
  } catch (error) {
    backendLogger.error("Token generation failed:", {
      error: error.message,
      stack: config.NODE_ENV === "development" ? error.stack : undefined,
    });
    throw error;
  }
};


const verifyToken = (token, type = TOKEN_TYPES.ACCESS) => {
  try {
    const secret =
      type === TOKEN_TYPES.REFRESH
        ? config.REFRESH_TOKEN_SECRET
        : config.JWT_SECRET;

    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
      audience: config.JWT_AUDIENCE || "code-tutor-api",
      issuer: config.JWT_ISSUER || "code-tutor",
    });

    // Verify if the token has been revoked
    if (revokedTokens.has(decoded.jti)) {
      throw new Error("Token has been revoked");
    }

    // Verify token type
    if (decoded.type !== type) {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    backendLogger.error("Token verification failed:", {
      error: error.message,
      type,
    });
    throw error;
  }
};


const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = verifyToken(refreshToken, TOKEN_TYPES.REFRESH);

    // Generate a new access token
    const accessToken = jwt.sign(
      {
        jti: generateTokenId(),
        id: decoded.id,
        type: TOKEN_TYPES.ACCESS,
      },
      config.JWT_SECRET,
      {
        expiresIn: config.JWT_EXPIRATION,
        algorithm: "HS256",
        audience: config.JWT_AUDIENCE || "code-tutor-api",
        issuer: config.JWT_ISSUER || "code-tutor",
      }
    );

    backendLogger.info("Access token refreshed", {
      userId: decoded.id,
    });

    return {
      accessToken,
      expiresIn: parseInt(config.JWT_EXPIRATION),
      tokenType: "Bearer",
    };
  } catch (error) {
    backendLogger.error("Token refresh failed:", error);
    throw error;
  }
};


const revokeToken = async (token, type = TOKEN_TYPES.ACCESS) => {
  try {
    const decoded = verifyToken(token, type);
    revokedTokens.add(decoded.jti);

    // Clean up expired tokens from the cache periodically
    if (revokedTokens.size > 1000) {
      clearExpiredTokens();
    }

    backendLogger.info("Token revoked successfully", {
      tokenId: decoded.jti,
      type,
    });
  } catch (error) {
    backendLogger.error("Token revocation failed:", error);
    throw error;
  }
};


const clearExpiredTokens = () => {
  const now = Date.now();

  for (const tokenId of revokedTokens) {
    try {
      const decoded = jwt.decode(tokenId);
      if (decoded && decoded.exp * 1000 < now) {
        revokedTokens.delete(tokenId);
      }
    } catch (error) {
      backendLogger.warn("Error cleaning revoked token:", {
        tokenId,
        error: error.message,
      });
    }
  }
};

// Clean up revoked tokens periodically
setInterval(clearExpiredTokens, 3600000); // Every hour


const validateToken = async (token) => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ["HS256"],
      audience: config.JWT_AUDIENCE || "code-tutor-api",
      issuer: config.JWT_ISSUER || "code-tutor"
    });

    if (!decoded.id || !decoded.type) {
      throw new Error("Invalid token structure");
    }

    return decoded;
  } catch (error) {
    backendLogger.error("Token validation failed:", {
      error: error.message,
      stack: config.NODE_ENV === "development" ? error.stack : undefined
    });
    throw error;
  }
};

export {
  generateTokens,
  verifyToken,
  validateToken,
  refreshAccessToken,
  revokeToken,
  TOKEN_TYPES
};
  
export const jwtUtils = {
  generateTokenId,
  validateUserData,
  clearExpiredTokens,
};
