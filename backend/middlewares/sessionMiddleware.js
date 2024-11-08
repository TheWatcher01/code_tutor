/**
 * @file sessionMiddleware.js
 * @description Enhanced session management with security features
 * @author TheWatcher01
 * @date 2024-11-08
 */

import session from "express-session";
import MongoStore from "connect-mongo";
import config from "../config/dotenvConfig.js";
import backendLogger from "../config/backendLogger.js";

// Configure session store with MongoDB
const sessionStore = MongoStore.create({
  mongoUrl: config.MONGODB_URI,
  collectionName: "sessions",
  ttl: config.SESSION_MAX_AGE / 1000,
  autoRemove: "native",
  touchAfter: 24 * 3600,
  crypto: {
    secret: config.SESSION_SECRET,
  },
});

// Log session store events
sessionStore.on("error", (error) => {
  backendLogger.error("Session store error:", error);
});

sessionStore.on("create", (sessionId) => {
  backendLogger.debug("Session created:", { sessionId });
});

sessionStore.on("destroy", (sessionId) => {
  backendLogger.debug("Session destroyed:", { sessionId });
});

sessionStore.on('touch', (sessionId) => {
  backendLogger.debug("Session refreshed:", {
    sessionId,
    timestamp: new Date().toISOString(),
    ttl: sessionStore.getTTL(sessionId)
  });
});

// Configuration de base de la session
const baseSessionMiddleware = session({
  store: sessionStore,
  secret: config.SESSION_SECRET,
  name: config.SESSION_NAME,
  resave: true,
  saveUninitialized: true,
  rolling: true,
  cookie: {
    secure: config.NODE_ENV === "production",
    httpOnly: true,
    domain: config.COOKIE_DOMAIN || 'localhost',
    path: "/",
    sameSite: "lax",
    maxAge: parseInt(config.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000,
  },
  proxy: config.NODE_ENV === "production"
});

// Constantes
const SESSION_TIMEOUT = 5000; // 5 secondes

// Middleware principal avec timeout et logging
const sessionMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const timeoutId = setTimeout(() => {
    backendLogger.warn("Session middleware timeout", {
      sessionId: req.sessionID,
      duration: SESSION_TIMEOUT
    });
  }, SESSION_TIMEOUT);

  baseSessionMiddleware(req, res, (err) => {
    clearTimeout(timeoutId);
    
    if (err) {
      backendLogger.error("Session middleware error:", {
        error: err.message,
        stack: err.stack,
        duration: Date.now() - startTime,
        sessionId: req.sessionID
      });
      return next(err);
    }

    backendLogger.debug("Session middleware completed:", {
      duration: Date.now() - startTime,
      sessionId: req.sessionID,
      isNew: req.session.isNew
    });

    next();
  });
};

// Vérification de session
const verifySession = (req, res, next) => {
  const sessionStartTime = Date.now();

  if (!req.session || !req.sessionID) {
    backendLogger.warn("Invalid session detected", {
      sessionExists: !!req.session,
      sessionId: req.sessionID,
      headers: {
        cookie: req.headers.cookie,
        userAgent: req.headers['user-agent']
      },
      ip: req.ip
    });
    return res.status(401).json({
      success: false,
      error: "Invalid session",
    });
  }

  const sessionAge = Date.now() - new Date(req.session.cookie.expires).getTime();
  if (sessionAge > config.SESSION_MAX_AGE) {
    backendLogger.warn("Expired session detected", {
      sessionId: req.sessionID,
      age: sessionAge,
      maxAge: config.SESSION_MAX_AGE
    });
    return res.status(401).json({
      success: false,
      error: "Session expired",
    });
  }

  backendLogger.debug("Session verification:", {
    sessionId: req.sessionID,
    duration: Date.now() - sessionStartTime,
    cookie: {
      expires: req.session.cookie.expires,
      maxAge: req.session.cookie.maxAge
    },
    user: req.session.user?.id
  });

  next();
};

export default sessionMiddleware;
export { sessionStore, verifySession };
