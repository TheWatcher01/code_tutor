/**
 * @file githubAuthService.js
 * @description Handles GitHub OAuth authentication process
 * @author TheWatcher01
 * @date 2024-11-12
 */

import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import backendLogger from "../config/backendLogger.js";
import config from "../config/dotenvConfig.js";

// Authentication constants
const AUTH_CONSTANTS = {
  SCOPES: ["user", "user:email", "read:user", "repo", "read:org", "gist"],
  DEFAULT_REDIRECT: "/playground",
  SESSION_KEYS: {
    STATE: "githubState",
    REDIRECT_URL: "redirectUrl",
    AUTH_IN_PROGRESS: "authInProgress",
  },
};

class GitHubAuthService {
  constructor() {
    this.setupPassport();
  }

  setupPassport() {
    // Configure GitHub strategy
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.GITHUB_CLIENT_ID,
          clientSecret: config.GITHUB_CLIENT_SECRET,
          callbackURL: config.GITHUB_CALLBACK_URL,
          scope: AUTH_CONSTANTS.SCOPES,
          state: true,
          pkce: true,
          passReqToCallback: true,
        },
        this.handleAuthCallback.bind(this)
      )
    );

    // Configure session serialization
    passport.serializeUser(this.serializeUser);
    passport.deserializeUser(this.deserializeUser);
  }

  /**
   * Handles the GitHub OAuth callback
   * Note: This only handles authentication, not user data fetching
   */
  async handleAuthCallback(req, accessToken, refreshToken, profile, done) {
    try {
      backendLogger.info("GitHub authentication callback initiated", {
        profileId: profile.id,
        sessionId: req.sessionID,
      });

      // Store authentication state
      this.storeAuthState(req, {
        state: req.query.state,
        redirectUrl:
          req.session[AUTH_CONSTANTS.SESSION_KEYS.REDIRECT_URL] ||
          AUTH_CONSTANTS.DEFAULT_REDIRECT,
      });

      // Create basic user object with only essential OAuth data
      const user = {
        id: profile.id,
        githubId: profile.id,
        username: profile.username,
        email: profile.emails?.[0]?.value, // Get primary email if available
        githubAccessToken: accessToken,
        githubRefreshToken: refreshToken,
        role: "user",
      };

      backendLogger.info("GitHub authentication successful", {
        userId: user.id,
        username: user.username,
      });

      return done(null, user);
    } catch (error) {
      backendLogger.error("GitHub authentication failed", {
        error: error.message,
        sessionId: req.sessionID,
      });
      return done(error, null);
    }
  }

  /**
   * Stores authentication state in session
   */
  storeAuthState(req, { state, redirectUrl }) {
    req.session[AUTH_CONSTANTS.SESSION_KEYS.STATE] = state;
    req.session[AUTH_CONSTANTS.SESSION_KEYS.REDIRECT_URL] = redirectUrl;
    req.session[AUTH_CONSTANTS.SESSION_KEYS.AUTH_IN_PROGRESS] = true;

    backendLogger.debug("Auth state stored in session", {
      state,
      redirectUrl,
      sessionId: req.sessionID,
    });
  }

  /**
   * Session serialization
   */
  serializeUser(user, done) {
    backendLogger.debug("Serializing user", { userId: user.id });
    done(null, user);
  }

  /**
   * Session deserialization
   */
  deserializeUser(user, done) {
    backendLogger.debug("Deserializing user", { userId: user.id });
    done(null, user);
  }

  /**
   * Gets the redirect URL from session
   */
  getRedirectUrl(req) {
    return (
      req.session[AUTH_CONSTANTS.SESSION_KEYS.REDIRECT_URL] ||
      AUTH_CONSTANTS.DEFAULT_REDIRECT
    );
  }

  /**
   * Initializes the authentication service
   */
  initialize() {
    return passport;
  }
}

// Create and export service instance
const githubAuthService = new GitHubAuthService();

export default githubAuthService.initialize();
export { AUTH_CONSTANTS, githubAuthService };
