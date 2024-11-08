/**
 * @file githubService.js
 * @description Service for GitHub authentication and interaction management
 * @author TheWatcher01
 * @date 2024-11-08
 */

import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Octokit } from "@octokit/rest";
import backendLogger from "../config/backendLogger.js";
import config from "../config/dotenvConfig.js";

// Required GitHub authentication scopes
const GITHUB_SCOPES = [
  "user",
  "user:email",
  "read:user",
  "repo",
  "read:org",
  "gist",
];

// Octokit instances cache with TTL
class OctokitCache extends Map {
  constructor(ttl = 3600000) {
    super();
    this.ttl = ttl;
    this.intervals = new Map();
  }

  set(key, value) {
    if (this.intervals.has(key)) {
      clearTimeout(this.intervals.get(key));
    }

    const interval = setTimeout(() => {
      this.delete(key);
      this.intervals.delete(key);
    }, this.ttl);

    this.intervals.set(key, interval);
    return super.set(key, value);
  }

  delete(key) {
    if (this.intervals.has(key)) {
      clearTimeout(this.intervals.get(key));
      this.intervals.delete(key);
    }
    return super.delete(key);
  }

  clear() {
    this.intervals.forEach(interval => clearTimeout(interval));
    this.intervals.clear();
    return super.clear();
  }
}

const octokitCache = new OctokitCache();

// Get or create an Octokit instance for a given token
const getOctokit = async (accessToken) => {
  try {
    if (octokitCache.has(accessToken)) {
      return octokitCache.get(accessToken);
    }

    const octokit = new Octokit({
      auth: accessToken,
      userAgent: "CodeTutor-App/1.0.0",
      timeZone: "UTC",
      retry: {
        enabled: true,
        retries: 3,
      },
      throttle: {
        enabled: true,
        onRateLimit: (retryAfter) => {
          backendLogger.warn(`Rate limit exceeded, retrying after ${retryAfter} seconds`);
          return retryAfter <= 60;
        },
        onSecondaryRateLimit: (retryAfter) => {
          backendLogger.warn(`Secondary rate limit hit, retrying after ${retryAfter} seconds`);
          return retryAfter <= 60;
        },
      },
    });

    octokitCache.set(accessToken, octokit);
    return octokit;
  } catch (error) {
    backendLogger.error("Octokit initialization failed:", error);
    throw new Error("GitHub API client initialization failed");
  }
};

// Fetch detailed GitHub user information
const getGitHubUserDetails = async (accessToken) => {
  try {
    const octokit = await getOctokit(accessToken);
    const [userResponse, emailsResponse] = await Promise.all([
      octokit.users.getAuthenticated(),
      octokit.users.listEmailsForAuthenticatedUser(),
    ]);

    const primaryEmail = emailsResponse.data.find(email => email.primary)?.email;
    if (!primaryEmail) {
      throw new Error("No primary email found in GitHub account");
    }

    return {
      id: userResponse.data.id,
      login: userResponse.data.login,
      email: primaryEmail,
      name: userResponse.data.name || userResponse.data.login,
      avatarUrl: userResponse.data.avatar_url,
      publicRepos: userResponse.data.public_repos,
      followers: userResponse.data.followers,
      following: userResponse.data.following,
      createdAt: userResponse.data.created_at,
    };
  } catch (error) {
    backendLogger.error("GitHub user details fetch failed:", error);
    throw error;
  }
};

// Configure GitHub authentication strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
      callbackURL: config.GITHUB_CALLBACK_URL,
      scope: GITHUB_SCOPES,
      state: true,
      pkce: true,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        backendLogger.info("GitHub authentication strategy executing", {
          profileId: profile.id,
          username: profile.username,
          accessTokenPresent: !!accessToken,
          refreshTokenPresent: !!refreshToken,
          sessionId: req.sessionID
        });

        const userDetails = await getGitHubUserDetails(accessToken);
        
        backendLogger.debug("GitHub user details fetched", {
          email: userDetails.email,
          name: userDetails.name,
          profileComplete: !!userDetails
        });

        // Store state in session
        req.session.githubState = req.query.state;
        
        backendLogger.debug("Session state stored", {
          state: req.session.githubState,
          sessionId: req.sessionID
        });

        // Build user object with GitHub data
        const user = {
          id: profile.id,
          githubId: profile.id,
          username: profile.username,
          email: userDetails.email,
          profile: {
            name: userDetails.name,
            avatarUrl: userDetails.avatarUrl,
            publicRepos: userDetails.publicRepos,
            followers: userDetails.followers,
            createdAt: userDetails.createdAt,
          },
          role: "user",
          githubAccessToken: accessToken,
          githubRefreshToken: refreshToken,
        };

        backendLogger.info("GitHub user object built", {
          userId: user.id,
          username: user.username,
          email: user.email
        });

        return done(null, user);
      } catch (error) {
        backendLogger.error("GitHub strategy error:", {
          error: error.message,
          stack: error.stack,
          sessionId: req.sessionID,
          state: req.query.state
        });
        return done(error, null);
      }
    }
  )
);

// Configure session serialization (minimal as we use JWT)
passport.serializeUser((user, done) => {
  backendLogger.debug("Serializing user", {
    userId: user.id,
    username: user.username
  });
  done(null, user);
});

passport.deserializeUser((user, done) => {
  backendLogger.debug("Deserializing user", {
    userId: user.id,
    username: user.username
  });
  done(null, user);
});

export default passport;

// Export utilities
export const githubUtils = {
  getOctokit,
  getGitHubUserDetails,
  GITHUB_SCOPES,
};
