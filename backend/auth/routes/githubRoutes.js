/**
 * @file githubRoutes.js
 * @description GitHub OAuth routes with simplified flow
 * @author TheWatcher01
 * @date 2024-11-12
 */

import express from "express";
import passport from "../githubAuthService.js";
import { githubAuthService, AUTH_CONSTANTS } from "../githubAuthService.js";
import backendLogger from "../../config/backendLogger.js";
import config from "../../config/dotenvConfig.js";
import { generateTokens } from "../jwtService.js";

const router = express.Router();

const ROUTES = {
  SUCCESS: "/playground",
  FAILURE: "/login",
};

/**
 * Builds frontend redirect URL with tokens
 */
const buildRedirectUrl = (path, params = {}) => {
  const url = new URL(path, config.FRONTEND_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value.toString());
  });
  return url.toString();
};

/**
 * Initialize GitHub authentication
 */
router.get("/", (req, res, next) => {
  try {
    req.session.returnTo = ROUTES.SUCCESS;

    backendLogger.info("Starting GitHub authentication");

    passport.authenticate("github", {
      scope: AUTH_CONSTANTS.SCOPES,
      session: true,
    })(req, res, next);
  } catch (error) {
    backendLogger.error("Auth initialization failed:", error);
    res.redirect(buildRedirectUrl(ROUTES.FAILURE));
  }
});

/**
 * Handle GitHub OAuth callback
 */
router.get(
  "/callback",
  passport.authenticate("github", {
    failureRedirect: buildRedirectUrl(ROUTES.FAILURE),
    session: true,
  }),
  async (req, res) => {
    try {
      const { user } = req;
      if (!user) {
        throw new Error("No user data received");
      }

      // Generate tokens
      const tokens = await generateTokens(user);

      backendLogger.info("Authentication successful", {
        userId: user.id,
        username: user.username,
      });

      // Set tokens in cookies for added security
      res.cookie("accessToken", tokens.accessToken, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      // Redirect with token in URL (for frontend)
      const redirectUrl = buildRedirectUrl(
        req.session.returnTo || ROUTES.SUCCESS,
        {
          access_token: tokens.accessToken,
        }
      );

      res.redirect(redirectUrl);
    } catch (error) {
      backendLogger.error("Callback processing failed:", error);
      res.redirect(buildRedirectUrl(ROUTES.FAILURE));
    }
  }
);

export default router;
