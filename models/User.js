// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');

// const userSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, 'Name is required'],
//     trim: true,
//     maxlength: [50, 'Name cannot exceed 50 characters']
//   },
//   firstName: {
//     type: String,
//     trim: true
//   },
//   lastName: {
//     type: String,
//     trim: true,
//   },
//   region: {
//     type: String,
//     trim: true
//   },
//   gender: {
//     type: String,
//     enum: ['male', 'female', 'other'],
//   },
//   age: {
//     type: Number,
//   },
//   email: {
//     type: String,
//     required: [true, 'Email is required'],
//     unique: true,
//     lowercase: true,
//     match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
//   },
//   password: {
//     type: String,
//     required: [true, 'Password is required'],
//     minlength: [6, 'Password must be at least 6 characters'],
//     select: false
//   },
//   plan: {
//     type: String,
//     enum: ['basic', 'pro', 'pro_max'],
//     default: 'basic'
//   },
//   remaining_tokens: {
//     type: Number,
//   },
//   history: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'PromptHistory'
//   }],
//   roles: [{
//     type: String,
//     enum: ['Admin', 'SEO Manager', 'Marketing Manager', 'UI/UX Designer', 'User'],
//     default: 'User'
//   }],
//   profile_picture: {
//     type: String,
//     default: null
//   },
//   status: {
//     type: String,
//     enum: ['active', 'suspended', 'inactive'],
//     default: 'active'
//   },
//   resetPasswordToken: String,
//   resetPasswordExpire: Date,
//   emailVerified: {
//     type: Boolean,
//     default: false
//   },
//   emailVerificationToken: String,
//   lastLogin: Date
// }, {
//   timestamps: true
// });

// // Hash password before saving
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();

//   const salt = await bcrypt.genSalt(12);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// // Compare password method
// userSchema.methods.comparePassword = async function(candidatePassword) {
//   return await bcrypt.compare(candidatePassword, this.password);
// };

// // Update tokens based on plan
// userSchema.methods.updateTokensForPlan = function(plan) {
//   const tokenLimits = {
//     basic: 5,
//     pro: 50,
//     pro_max: 100
//   };

//   this.plan = plan;
//   this.remaining_tokens = tokenLimits[plan];
//   return this.save();
// };

// // Check if user has permission
// userSchema.methods.hasPermission = function(requiredRole) {
//   if (this.roles.includes('Admin')) return true;
//   return this.roles.includes(requiredRole);
// };

// module.exports = mongoose.model('User', userSchema);
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    age: {
      type: Number,
      min: [0, "Age cannot be negative"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password not required for Google users
      },
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    // Google Authentication fields
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    plan: {
      type: String,
      enum: ["basic", "lite", "standard", "pro", "pro_max"],
      default: "basic",
    },
    has_used_trial: {
      type: Boolean,
      default: false,
    },
    subscription_status: {
      type: String,
      enum: [
        "trialing",
        "active",
        "cancelling",
        "past_due",
        "unpaid",
        "canceled",
        "incomplete",
        "incomplete_expired",
        null,
      ],
      default: null,
    },
    trial_end: {
      type: Date,
      default: null,
    },
    current_period_end: {
      type: Date,
      default: null,
    },
    has_paid_once: {
      type: Boolean,
      default: false,
    },
    payment_option: {
      type: String,
      enum: ["pay_now", "try_free", null],
      default: null,
    },
    remaining_tokens: {
      type: Number,
      default: 3000000, // Default tokens for new users
    },
    history: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PromptHistory",
      },
    ],
    roles: [
      {
        type: String,
        // enum: ["Admin", "SEO Manager", "Marketing Manager", "UI/UX Designer", "User"],
        default: "User",
      },
    ],
    profile_picture: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "inactive"],
      default: "active",
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    lastLogin: Date,
    // Additional Google-specific fields
    refreshToken: {
      type: String,
      select: false,
    },
    selected_categories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "NewsCategory" }],
      default: [],
    },
    favorites: [{ type: String }],
    favorite_marketing_tools: [{ type: String }],
    bookmarks: [
      {
        itemId: { type: mongoose.Schema.Types.Mixed, required: true },
        modelName: { type: String, required: true },
      },
    ],
    favourite_prompts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PromptData", // Reference to the new PromptData model
      },
    ],
    daily_usage: {
      count: { type: Number, default: 0 },
      date: { type: Date, default: new Date().setHours(0, 0, 0, 0) },
    },
    dual_chat_text_usage: {
      count: { type: Number, default: 0 },
      reset_at: { type: Date },
      last_prompt_id: { type: String },
    },
    dual_chat_image_usage: {
      count: { type: Number, default: 0 },
      reset_at: { type: Date },
      last_prompt_id: { type: String },
    },
    multi_chat_text_usage: {
      count: { type: Number, default: 0 },
      reset_at: { type: Date },
      last_prompt_id: { type: String },
    },
    multi_chat_image_usage: {
      count: { type: Number, default: 0 },
      reset_at: { type: Date },
      last_prompt_id: { type: String },
    },
    single_chat_text_usage: {
      count: { type: Number, default: 0 },
      reset_at: { type: Date },
      last_prompt_id: { type: String },
    },
    single_chat_image_usage: {
      count: { type: Number, default: 0 },
      reset_at: { type: Date },
      last_prompt_id: { type: String },
    },
    // Add this inside your User Schema
    combined_chat_text_usage: {
      count: { type: Number, default: 0 },
      reset_at: { type: Date },
      last_prompt_id: { type: String },
    },
    forceLogoutDate: {
      type: Date,
      default: null,
    },
    devices: [
      {
        deviceType: String,
        browser: String,
        os: String,
        userAgent: String,
        ip: String,
        loginAt: Date,
      },
    ],
    storageUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasSeenWelcomePopup: {
      type: Boolean,
      default: false,
    },
    video_credits: {
      type: Number,
      default: 0, // Free users get 0
    },
    image_credits: {
      type: Number,
      default: 0,
    },
    onboarding_completion_pct: {
      type: Number,
      default: 0,
      enum: [0, 33, 66, 100],
    },
    activation_pct: {
      type: Number,
      default: 0,
      enum: [0, 33, 66, 100],
    },
    paid_conversion_pct: {
      type: Number,
      default: 0,
      enum: [0, 33, 66, 100],
    },
    isDiscountEligible: {
      type: Boolean,
      default: false,
    },
    interests: {
      type: [String],
      default: [],
    },
    rdt_cid: {
      type: String,
      default: null,
    },
    rdtCid: {
      type: String,
      default: null,
    },
    fbc: {
      type: String,
      default: null,
    },
    fbp: {
      type: String,
      default: null,
    },
    signupIp: {
      type: String,
      default: null,
    },
    signupUserAgent: {
      type: String,
      default: null,
    },
    gclid: {
      type: String,
      default: null,
    },
    gbraid: {
      type: String,
      default: null,
    },
    wbraid: {
      type: String,
      default: null,
    },
    customized_dashboard_tools: {
      type: Map,
      of: [String],
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving (only for local auth)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.authProvider === "google")
    return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method (only for local auth)
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (this.authProvider === "google") {
    throw new Error("Password comparison not available for Google users");
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update tokens based on plan
userSchema.methods.updateTokensForPlan = function (plan) {
  const tokenLimits = {
    basic: 3000000,
    lite: 3500000,
    standard: 4000000,
    pro: 5000000,
    pro_max: 10000000,
  };

  const videoCreditLimits = {
    basic: 0,
    lite: 0,
    standard: 0,
    pro: 400,
    pro_max: 1000,
  };

  const imageCreditLimits = {
    basic: 0,
    lite: 0,
    standard: 300,
    pro: 1000,
    pro_max: 2000,
  };

  this.plan = plan;
  this.remaining_tokens = tokenLimits[plan];
  this.video_credits = videoCreditLimits[plan];
  this.image_credits = imageCreditLimits[plan];
  return this.save();
};

// Check if user has permission
userSchema.methods.hasPermission = function (requiredRole) {
  if (this.roles.includes("Admin")) return true;
  return this.roles.includes(requiredRole);
};

module.exports = mongoose.model("User", userSchema);
