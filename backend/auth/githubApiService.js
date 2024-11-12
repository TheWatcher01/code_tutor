/**
 * @file githubApiService.js
 * @description Handles GitHub API interactions using Octokit
 * @author TheWatcher01
 * @date 2024-11-12
 */

import { Octokit } from "@octokit/rest";
import backendLogger from "../config/backendLogger.js";

// Cache implementation for Octokit instances
class OctokitCache extends Map {
  constructor(ttl = 3600000) {
    // 1 hour TTL by default
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
    this.intervals.forEach((interval) => clearTimeout(interval));
    this.intervals.clear();
    return super.clear();
  }
}

class GitHubApiService {
  constructor() {
    this.octokitCache = new OctokitCache();
  }

  /**
   * Gets or creates an Octokit instance for the given access token
   */
  async getOctokit(accessToken) {
    try {
      if (this.octokitCache.has(accessToken)) {
        return this.octokitCache.get(accessToken);
      }

      const octokit = new Octokit({
        auth: accessToken,
        userAgent: "CodeTutor-App/1.0.0",
        timeZone: "UTC",
        retry: { enabled: true, retries: 3 },
        throttle: {
          enabled: true,
          onRateLimit: (retryAfter) => {
            backendLogger.warn(
              `Rate limit exceeded, retrying after ${retryAfter}s`
            );
            return retryAfter <= 60;
          },
          onSecondaryRateLimit: (retryAfter) => {
            backendLogger.warn(
              `Secondary rate limit hit, retrying after ${retryAfter}s`
            );
            return retryAfter <= 60;
          },
        },
      });

      this.octokitCache.set(accessToken, octokit);
      return octokit;
    } catch (error) {
      backendLogger.error("Octokit initialization failed:", error);
      throw new Error("GitHub API client initialization failed");
    }
  }

  /**
   * Fetches detailed user information from GitHub
   * This should be called only after successful authentication
   */
  async getUserDetails(accessToken) {
    try {
      const octokit = await this.getOctokit(accessToken);
      const [userResponse, emailsResponse] = await Promise.all([
        octokit.users.getAuthenticated(),
        octokit.users.listEmailsForAuthenticatedUser(),
      ]);

      const primaryEmail = emailsResponse.data.find(
        (email) => email.primary
      )?.email;
      if (!primaryEmail) {
        throw new Error("No primary email found in GitHub account");
      }

      return {
        id: userResponse.data.id,
        login: userResponse.data.login,
        email: primaryEmail,
        name: userResponse.data.name || userResponse.data.login,
        avatarUrl: userResponse.data.avatar_url,
        profile: {
          publicRepos: userResponse.data.public_repos,
          followers: userResponse.data.followers,
          following: userResponse.data.following,
          createdAt: userResponse.data.created_at,
          bio: userResponse.data.bio,
          company: userResponse.data.company,
          location: userResponse.data.location,
          blog: userResponse.data.blog,
        },
      };
    } catch (error) {
      backendLogger.error("GitHub user details fetch failed:", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Fetches user's repositories
   */
  async getUserRepositories(accessToken, options = {}) {
    try {
      const octokit = await this.getOctokit(accessToken);
      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        direction: "desc",
        per_page: options.per_page || 10,
        page: options.page || 1,
      });

      return data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        isPrivate: repo.private,
        updatedAt: repo.updated_at,
      }));
    } catch (error) {
      backendLogger.error("Failed to fetch user repositories:", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Validates GitHub access token
   */
  async validateAccessToken(accessToken) {
    try {
      const octokit = await this.getOctokit(accessToken);
      await octokit.users.getAuthenticated();
      return true;
    } catch (error) {
      backendLogger.warn("Access token validation failed:", {
        error: error.message,
      });
      return false;
    }
  }
}

// Create and export service instance
const githubApiService = new GitHubApiService();
export default githubApiService;
