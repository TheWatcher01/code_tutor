/**
 * @file githubRoutes.js
 * @description Routes for GitHub OAuth authentication
 * @author TheWatcher01
 * @date 2024-11-08
 */

import express from "express";
import passport from "../githubService.js";
import backendLogger from "../../config/backendLogger.js";
import config from "../../config/dotenvConfig.js";
import { generateTokens, validateToken } from "../jwtService.js";
import crypto from "crypto";
import { githubUtils } from "../githubService.js";

const router = express.Router();
const { GITHUB_SCOPES } = githubUtils;

// Security constants
const AUTH_TIMEOUT = 300000; // 5 minutes in milliseconds
const STATE_BYTES = 32;

// Ajout des constantes de performance
const PERFORMANCE_METRICS = {
  AUTH_SLOW_THRESHOLD: 2000, // 2 secondes
  CALLBACK_SLOW_THRESHOLD: 3000, // 3 secondes
};

// Generate secure random state for OAuth flow
const generateSecureState = () =>
  crypto.randomBytes(STATE_BYTES).toString("hex");

// Log auth requests
const logGithubAuth = (req, res, next) => {
  const startTime = Date.now();
  const requestId = crypto.randomBytes(8).toString('hex');

  backendLogger.debug("GitHub auth request:", {
    requestId,
    path: req.path,
    state: req.query.state,
    origin: req.headers.origin,
    userAgent: req.headers["user-agent"]?.substring(0, 100),
    ip: req.ip,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString(),
    headers: {
      referer: req.headers.referer,
      'accept-language': req.headers['accept-language']
    }
  });

  // Logging à la fin de la requête
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    if (duration > PERFORMANCE_METRICS.AUTH_SLOW_THRESHOLD) {
      backendLogger.warn("Slow auth request detected:", {
        requestId,
        duration,
        path: req.path,
        sessionId: req.sessionID
      });
    }

    backendLogger.debug("Auth request completed:", {
      requestId,
      duration,
      statusCode: res.statusCode,
      sessionId: req.sessionID
    });
  });

  next();
};

// Start GitHub authentication flow
router.get("/", logGithubAuth, (req, res, next) => {
  try {
    const state = generateSecureState();
    req.session.githubState = state;
    req.session.authStartTime = Date.now();

    backendLogger.info("Starting GitHub authentication flow", {
      sessionId: req.sessionID,
      state,
      scopes: GITHUB_SCOPES,
      timestamp: new Date().toISOString()
    });

    passport.authenticate("github", {
      scope: GITHUB_SCOPES,
      state,
      session: true,
      allowSignup: config.GITHUB_ALLOW_SIGNUP === 'true'
    })(req, res, next);
  } catch (error) {
    backendLogger.error("Auth initialization failed:", {
      error: error.message,
      stack: error.stack,
      scopes: GITHUB_SCOPES,
      timestamp: new Date().toISOString()
    });
    res.redirect(`${config.FRONTEND_URL}/login?error=github_init_failed`);
  }
});

// Handle GitHub OAuth callback
router.get(
  "/callback",
  logGithubAuth,
  (req, res, next) => {
    const callbackStartTime = Date.now();
    try {
      const { state } = req.query;
      const storedState = req.session.githubState;
      const authStartTime = req.session.authStartTime;

      // Métriques détaillées du processus d'auth
      const authMetrics = {
        totalDuration: Date.now() - authStartTime,
        steps: {
          stateValidation: Date.now() - callbackStartTime,
          oauthFlow: Date.now() - authStartTime,
          sessionSetup: Date.now() - authStartTime
        },
        memory: process.memoryUsage(),
        performance: {
          timeToFirstByte: res.getHeader('X-Response-Time'),
          redirectTime: Date.now() - authStartTime
        }
      };

      backendLogger.debug("Auth flow metrics:", authMetrics);

      backendLogger.debug("GitHub callback validation:", {
        queryState: state,
        storedState,
        authStartTime,
        sessionId: req.sessionID
      });

      if (!state || !storedState || state !== storedState) {
        throw new Error("Invalid state parameter");
      }

      const authDuration = Date.now() - authStartTime;
      if (authDuration > AUTH_TIMEOUT) {
        throw new Error("Authentication timeout");
      }

      next();
    } catch (error) {
      backendLogger.error("Callback validation failed:", {
        error: error.message,
        stack: error.stack,
        duration: Date.now() - callbackStartTime,
        sessionId: req.sessionID
      });
      res.redirect(`${config.FRONTEND_URL}/login?error=validation_failed`);
    }
  },
  passport.authenticate("github", {
    failureRedirect: `${config.FRONTEND_URL}/login?error=github_auth_failed`,
    session: true
  }),
  async (req, res) => {
    try {
      const { user } = req;
      
      backendLogger.info("GitHub authentication successful:", {
        userId: user?.id,
        username: user?.username,
        sessionId: req.sessionID
      });

      const redirectUrl = new URL("/playground", config.FRONTEND_URL);
      redirectUrl.searchParams.append("auth", "success");

      res.redirect(redirectUrl.toString());
    } catch (error) {
      backendLogger.error("Callback processing failed:", error);
      res.redirect(`${config.FRONTEND_URL}/login?error=callback_failed`);
    }
  }
);

// Check auth status
router.get("/status", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.json({
        success: true,
        data: { isAuthenticated: false },
      });
    }

    const decoded = await validateToken(token);

    res.json({
      success: true,
      data: {
        isAuthenticated: true,
        provider: "github",
        userId: decoded.id,
        username: decoded.username,
      },
    });
  } catch (error) {
    backendLogger.error("Status check failed:", error);
    res.status(401).json({
      success: false,
      error: "Invalid or expired authentication",
    });
  }
});

export default router;
