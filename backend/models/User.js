/**
 * @file User.js
 * @description Enhanced User model with security features and validation
 * @author TheWatcher01
 * @date 2024-11-08
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores and dashes",
      ],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include password by default in queries
    },

    role: {
      type: String,
      enum: {
        values: ["student", "mentor", "admin"],
        message: "{VALUE} is not a valid role",
      },
      default: "student",
    },

    githubId: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
    },

    githubProfile: {
      login: String,
      avatarUrl: String,
      htmlUrl: String,
      name: String,
      bio: String,
      location: String,
      company: String,
      blog: String,
      publicRepos: Number,
      followers: Number,
      following: Number,
      createdAt: Date,
    },

    githubToken: {
      type: String,
      select: false, // Don't include token by default in queries
    },

    active: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },

    loginAttempts: {
      count: {
        type: Number,
        default: 0,
      },
      lastAttempt: Date,
      lockedUntil: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.githubToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ githubId: 1 }, { sparse: true });

// Pre-save hook to hash password if modified
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Method to handle failed login attempts
UserSchema.methods.handleFailedLogin = async function () {
  this.loginAttempts.count += 1;
  this.loginAttempts.lastAttempt = new Date();

  if (this.loginAttempts.count >= 5) {
    const lockDuration = 15 * 60 * 1000; // 15 minutes
    this.loginAttempts.lockedUntil = new Date(Date.now() + lockDuration);
  }

  await this.save();
};

// Method to reset login attempts
UserSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = {
    count: 0,
    lastAttempt: null,
    lockedUntil: null,
  };
  await this.save();
};

// Method to update GitHub profile
UserSchema.methods.updateGithubProfile = async function (profile) {
  this.githubProfile = {
    login: profile.login,
    avatarUrl: profile.avatar_url,
    htmlUrl: profile.html_url,
    name: profile.name,
    bio: profile.bio,
    location: profile.location,
    company: profile.company,
    blog: profile.blog,
    publicRepos: profile.public_repos,
    followers: profile.followers,
    following: profile.following,
    createdAt: profile.created_at,
  };

  if (profile.email && !this.email) {
    this.email = profile.email;
  }

  await this.save();
};

// Static method to find by email with active check
UserSchema.statics.findByEmail = async function (email) {
  return this.findOne({ email, active: true });
};

export default mongoose.model("User", UserSchema);
