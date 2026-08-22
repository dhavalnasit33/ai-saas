// const express = require('express');
// const jwt = require('jsonwebtoken');
// const crypto = require('crypto');
// const User = require('../models/User');
// const { protect } = require('../middleware/auth');
// const { validateRegister, validateLogin, handleValidationErrors } = require('../middleware/validation');

// const router = express.Router();

// // Generate JWT Token
// const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRE || '7d'
//   });
// };

// // @desc    Register user
// // @route   POST /api/auth/register
// // @access  Public
// // router.post('/register', validateRegister, handleValidationErrors, async (req, res) => {
// //   try {
// //     const { name, email, password, roles } = req.body; // <-- Add roles

// //     // Check if user exists
// //     const existingUser = await User.findOne({ email });
// //     if (existingUser) {
// //       return res.status(400).json({
// //         success: false,
// //         message: 'User already exists with this email'
// //       });
// //     }

// //     // Create user
// //     const user = await User.create({
// //       name,
// //       email,
// //       password,
// //       roles,
// //       emailVerificationToken: crypto.randomBytes(20).toString('hex')
// //     });
// //     // Generate token
// //     const token = generateToken(user._id);

// //     res.status(201).json({
// //       success: true,
// //       message: 'User registered successfully',
// //       token,
// //       user: {
// //         id: user._id,
// //         name: user.name,
// //         email: user.email,
// //         plan: user.plan,
// //         remaining_tokens: user.remaining_tokens,
// //         roles: user.roles,
// //         status: user.status
// //       }
// //     });
// //   } catch (error) {
// //     console.error('Registration error:', error);
// //     res.status(500).json({
// //       success: false,
// //       message: 'Server error during registration'
// //     });
// //   }
// // });

// // @desc    Register user
// // @route   POST /api/auth/register
// // @access  Public
// router.post('/register', validateRegister, handleValidationErrors, async (req, res) => {
//   try {
//     const { name, firstName, lastName, email, password, region, gender, age, roles, profile_picture } = req.body;

//     // Check if user exists
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'User already exists with this email'
//       });
//     }

//     // Create user
//     const user = await User.create({
//       name,
//       firstName,
//       lastName,
//       email,
//       password,
//       region,
//       gender,
//       age,
//       roles,
//       profile_picture,
//       emailVerificationToken: crypto.randomBytes(20).toString('hex')
//     });

//     // Generate token
//     const token = generateToken(user._id);

//     res.status(201).json({
//       success: true,
//       message: 'User registered successfully',
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         email: user.email,
//         plan: user.plan,
//         remaining_tokens: user.remaining_tokens,
//         roles: user.roles,
//         status: user.status,
//         profile_picture: user.profile_picture,
//         region: user.region,
//         gender: user.gender,
//         age: user.age
//       }
//     });
//   } catch (error) {
//     console.error('Registration error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during registration'
//     });
//   }
// });

// // @desc    Login user
// // @route   POST /api/auth/login
// // @access  Public
// router.post('/login', validateLogin, handleValidationErrors, async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Check for user and include password
//     const user = await User.findOne({ email }).select('+password');
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     // Check if password matches
//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     // Check if account is active
//     if (user.status !== 'active') {
//       return res.status(401).json({
//         success: false,
//         message: 'Account is suspended or inactive'
//       });
//     }

//     // Update last login
//     user.lastLogin = new Date();
//     await user.save();

//     // Generate token
//     const token = generateToken(user._id);

//     res.json({
//       success: true,
//       message: 'Login successful',
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         plan: user.plan,
//         remaining_tokens: user.remaining_tokens,
//         roles: user.roles,
//         status: user.status,
//         profile_picture: user.profile_picture
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during login'
//     });
//   }
// });

// // @desc    Get current user
// // @route   GET /api/auth/me
// // @access  Private
// router.get('/me', protect, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id).populate('history');

//     res.json({
//       success: true,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         plan: user.plan,
//         remaining_tokens: user.remaining_tokens,
//         roles: user.roles,
//         status: user.status,
//         profile_picture: user.profile_picture,
//         emailVerified: user.emailVerified,
//         lastLogin: user.lastLogin,
//         createdAt: user.createdAt
//       }
//     });
//   } catch (error) {
//     console.error('Get user error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });

// // @desc    Update user profile
// // @route   PUT /api/auth/profile
// // @access  Private
// router.put('/profile', protect, async (req, res) => {
//   try {
//     const { name, profile_picture } = req.body;

//     const user = await User.findById(req.user.id);

//     if (name) user.name = name;
//     if (profile_picture) user.profile_picture = profile_picture;

//     await user.save();

//     res.json({
//       success: true,
//       message: 'Profile updated successfully',
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         plan: user.plan,
//         remaining_tokens: user.remaining_tokens,
//         roles: user.roles,
//         status: user.status,
//         profile_picture: user.profile_picture
//       }
//     });
//   } catch (error) {
//     console.error('Profile update error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during profile update'
//     });
//   }
// });

// // @desc    Change password
// // @route   PUT /api/auth/change-password
// // @access  Private
// router.put('/change-password', protect, async (req, res) => {
//   try {
//     const { currentPassword, newPassword } = req.body;

//     if (!currentPassword || !newPassword) {
//       return res.status(400).json({
//         success: false,
//         message: 'Current password and new password are required'
//       });
//     }

//     if (newPassword.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: 'New password must be at least 6 characters'
//       });
//     }

//     const user = await User.findById(req.user.id).select('+password');

//     // Check current password
//     const isMatch = await user.comparePassword(currentPassword);
//     if (!isMatch) {
//       return res.status(400).json({
//         success: false,
//         message: 'Current password is incorrect'
//       });
//     }

//     user.password = newPassword;
//     await user.save();

//     res.json({
//       success: true,
//       message: 'Password changed successfully'
//     });
//   } catch (error) {
//     console.error('Change password error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error during password change'
//     });
//   }
// });

// // @desc    Forgot password
// // @route   POST /api/auth/forgot-password
// // @access  Public
// router.post('/forgot-password', async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email is required'
//       });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found with this email'
//       });
//     }

//     // Generate reset token
//     const resetToken = crypto.randomBytes(20).toString('hex');

//     user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
//     user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

//     await user.save();

//     // In production, send email with reset link
//     // For now, return the token (remove this in production)
//     res.json({
//       success: true,
//       message: 'Password reset token sent to email',
//       resetToken: resetToken // Remove this in production
//     });
//   } catch (error) {
//     console.error('Forgot password error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });

// // @desc    Reset password
// // @route   PUT /api/auth/reset-password/:resettoken
// // @access  Public
// router.put('/reset-password/:resettoken', async (req, res) => {
//   try {
//     const { password } = req.body;

//     if (!password || password.length < 6) {
//       return res.status(400).json({
//         success: false,
//         message: 'Password must be at least 6 characters'
//       });
//     }

//     // Get hashed token
//     const resetPasswordToken = crypto
//       .createHash('sha256')
//       .update(req.params.resettoken)
//       .digest('hex');

//     const user = await User.findOne({
//       resetPasswordToken,
//       resetPasswordExpire: { $gt: Date.now() }
//     });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid or expired reset token'
//       });
//     }

//     // Set new password
//     user.password = password;
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;

//     await user.save();

//     // Generate new JWT token
//     const token = generateToken(user._id);

//     res.json({
//       success: true,
//       message: 'Password reset successful',
//       token
//     });
//   } catch (error) {
//     console.error('Reset password error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// });

// // @desc    Logout user
// // @route   POST /api/auth/logout
// // @access  Private
// router.post('/logout', protect, (req, res) => {
//   res.json({
//     success: true,
//     message: 'Logout successful'
//   });
// });

// module.exports = router;
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { handleGoogleAuth } = require("../middleware/google-auth");
const {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} = require("../middleware/validation");
const {
  ensureFocalboardUser,
  loginFocalboard,
} = require("../utils/focalboard.service");
const Setting = require("../models/Setting");
const { getDeviceInfo } = require("../utils/deviceInfo");
const GuestUsage = require("../models/GuestUsage");
const { loginLimiter, signupLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

const generateToken = async (id) => {
  const versionSetting = await Setting.findOne({ key: "web_version" });

  return jwt.sign(
    {
      id,
      web_version: versionSetting?.value || "v1",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || "7d",
    },
  );
};

// @desc    Force logout a specific user
// @route   POST /api/auth/force-logout/:id
// @access  Private (Admin only)
router.post("/force-logout/:id", protect, async (req, res) => {
  try {
    // 1. Verify the requester is an Admin
    const requester = await User.findById(req.user.id);
    if (!requester.roles.includes("Admin")) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to perform this action",
      });
    }

    const targetUserId = req.params.id;

    // 2. Find the user to be logged out
    const userToLogout = await User.findById(targetUserId);

    if (!userToLogout) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // 3. Check if the target user is an Admin (to match your bulk logout logic)
    if (userToLogout.roles.includes("Admin")) {
      return res.status(400).json({
        success: false,
        message: "Cannot force logout an Admin user",
      });
    }

    // 4. Update the forceLogoutDate for the specific user[cite: 2, 3]
    userToLogout.forceLogoutDate = new Date();
    await userToLogout.save();

    res.json({
      success: true,
      message: `User ${userToLogout.name} has been successfully scheduled for logout.`,
    });
  } catch (error) {
    console.error("Force logout specific user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during force logout",
    });
  }
});
router.post("/force-logout-users", protect, async (req, res) => {
  try {
    // 1. Verify the requester is an Admin
    const requester = await User.findById(req.user.id);
    if (!requester.roles.includes("Admin")) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to perform this action",
      });
    }

    // 2. Update forceLogoutDate for everyone who does NOT have 'Admin' in their roles array
    await User.updateMany(
      { roles: { $nin: ["Admin"] } },
      { $set: { forceLogoutDate: new Date() } },
    );

    res.json({
      success: true,
      message:
        "All non-admin users have been successfully scheduled for logout.",
    });
  } catch (error) {
    console.error("Force logout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during force logout",
    });
  }
});

router.post("/create-user", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      region,
      gender,
      age,
      profile_picture,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, email, and password are required",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const userData = {
      name: `${firstName} ${lastName}`,
      email,
      password,
      roles: ["User"],
    };

    if (region) userData.region = region;
    if (gender) userData.gender = gender;
    if (age) userData.age = age;
    if (profile_picture) userData.profile_picture = profile_picture;

    const user = new User(userData);
    await user.save();

    res.json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post("/register", signupLimiter, async (req, res) => {
  try {
    const { firstName, lastName, email, password, region } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, email, and password are required",
      });
    }

    if (firstName.length < 2 || firstName.length > 30) {
      return res
        .status(400)
        .json({ message: "First name must be between 2 and 30 characters" });
    }

    if (lastName.length < 2 || lastName.length > 30) {
      return res
        .status(400)
        .json({ message: "Last name must be between 2 and 30 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    console.log("Cookies:", req.cookies);
    console.log("rdt_cid cookie:", req.cookies?.rdt_cid);
    console.log("Body:", req.body);
    console.log("Header:", req.headers["x-reddit-click-id"]);
    const deviceInfo = getDeviceInfo(req);
    const rdtCidVal =
      req.cookies?.oc_rdt_cid ||
      req.cookies?.rdt_cid ||
      req.cookies?._rdt_cid ||
      req.body?.rdt_cid ||
      req.body?._rdt_cid ||
      req.headers?.["x-reddit-click-id"] ||
      null;
    const fbcVal = req.cookies?._fbc || req.cookies?.oc_fbc || req.body?.fbc || null;
    const fbpVal = req.cookies?._fbp || req.body?.fbp || null;
    const signupIpVal = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || null;
    const signupUserAgentVal = req.headers["user-agent"] || null;
    const gclidVal = req.cookies?.oc_gclid || req.body?.gclid || null;
    const gbraidVal = req.cookies?.oc_gbraid || req.body?.gbraid || null;
    const wbraidVal = req.cookies?.oc_wbraid || req.body?.wbraid || null;

    const user = new User({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      password,
      region, // <-- added this
      roles: ["User"],
      profile_picture: "",
      devices: [deviceInfo],
      rdt_cid: rdtCidVal,
      rdtCid: rdtCidVal,
      fbc: fbcVal,
      fbp: fbpVal,
      signupIp: signupIpVal,
      signupUserAgent: signupUserAgentVal,
      gclid: gclidVal,
      gbraid: gbraidVal,
      wbraid: wbraidVal,
    });
    await user.save();

    const token = await generateToken(user._id);

    // --- FOCALBOARD INTEGRATION ---
    let fbTokenForFrontend = null;

    try {
      const { username, password: fbPassword } =
        await ensureFocalboardUser(user);

      const fbSession = await loginFocalboard(username, fbPassword);

      if (fbSession) {
        console.log("✅ Focalboard session received");

        // Set cookie for browser
        const cookieValue = `${fbSession}; Domain=.onechatai.ai; Path=/; HttpOnly; Secure; SameSite=Lax`;
        console.log("🍪 Setting cookie:", cookieValue);

        res.setHeader("Set-Cookie", [cookieValue]);

        // Extract token
        if (fbSession.includes("FBSESSION=")) {
          fbTokenForFrontend = fbSession.split("FBSESSION=")[1].split(";")[0];
          console.log(
            "🎯 Extracted FB token for frontend:",
            fbTokenForFrontend,
          );
        } else {
          console.warn("⚠️ FBSESSION not found in cookie string");
        }
      } else {
        console.warn("⚠️ No Focalboard session returned");
      }
    } catch (fbErr) {
      console.error("Focalboard sync failed (Register):", fbErr.message);
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      fb_session_token: fbTokenForFrontend,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        plan: user.plan,
        remaining_tokens: user.remaining_tokens,
        roles: user.roles,
        status: user.status,
        profile_picture: user.profile_picture,
        region: user.region,
        gender: user.gender,
        age: user.age,
        video_credits: user.video_credits,
        image_credits: user.image_credits,
        hasSeenWelcomePopup: user.hasSeenWelcomePopup,
        payment_option: user.payment_option,
        isDiscountEligible: !user.has_used_trial && !user.has_paid_once,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

// // @desc    Login user
// // @route   POST /api/auth/login
// // @access  Public
// router.post("/login", validateLogin, handleValidationErrors, async (req, res) => {
//   try {
//     const { email, password } = req.body

//     // Check for user and include password
//     const user = await User.findOne({ email }).select("+password")
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       })
//     }

//     // Check if user is Google-only user
//     if (user.authProvider === "google") {
//       return res.status(400).json({
//         success: false,
//         message: "This account uses Google Sign-In. Please use Google authentication.",
//         authProvider: "google",
//       })
//     }

//     // Check if password matches
//     const isMatch = await user.comparePassword(password)
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid credentials",
//       })
//     }

//     // Check if account is active
//     if (user.status !== "active") {
//       return res.status(401).json({
//         success: false,
//         message: "Account is suspended or inactive",
//       })
//     }

//     // Update last login
//     user.lastLogin = new Date()
//     await user.save()

//     // Generate token
//     const token = generateToken(user._id)

//     res.json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         id: user._id,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         age: user.age,
//         region: user.region,
//         gender: user.gender,
//         name: user.name,
//         email: user.email,
//         plan: user.plan,
//         remaining_tokens: user.remaining_tokens,
//         roles: user.roles,
//         status: user.status,
//         profile_picture: user.profile_picture,
//         authProvider: user.authProvider,
//       },
//     })
//   } catch (error) {
//     console.error("Login error:", error)
//     res.status(500).json({
//       success: false,
//       message: "Server error during login",
//     })
//   }
// })

// @desc    Login user (normal + Google login support)
// @route   POST /api/auth/login
// @access  Public
router.post(
  "/login",
  loginLimiter,
  validateLogin, // your request validation middleware
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password, isGoogleLogin } = req.body;
      console.log("🔹 Login attempt:", { email, isGoogleLogin });

      // Find user by email (always include password)
      const user = await User.findOne({ email }).select("+password");
      console.log("🔹 User found:", !!user);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Determine if this is a Google login attempt
      const isGoogleLoginAttempt = isGoogleLogin === true;
      if (!isGoogleLoginAttempt) {
        // 🚫 Block Google-only users from manual login
        if (user.authProvider === "google") {
          return res.status(400).json({
            success: false,
            message:
              "This account uses Google login. Please login with Google.",
          });
        }

        // Password is required
        if (!password) {
          return res.status(400).json({
            success: false,
            message: "Password is required",
          });
        }

        // Safe password comparison
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: "Invalid credentials",
          });
        }
      } else {
        // Google login path
        console.log("🔹 Google login – password check skipped");
      }

      // Check if account is active
      if (user.status !== "active") {
        return res.status(401).json({
          success: false,
          message: "Account is suspended or inactive",
        });
      }

      // Update last login timestamp
      user.lastLogin = new Date();
      const deviceInfo = getDeviceInfo(req);

      // Save device
      user.devices.push(deviceInfo);

      // Keep only last 5 devices (optional)
      if (user.devices.length > 5) {
        user.devices.shift();
      }
      if (isGoogleLoginAttempt && user.authProvider !== "google") {
        user.authProvider = "google";
      }
      await user.save();
      console.log("✅ Last login updated");

      // Generate JWT token
      const token = await generateToken(user._id);

      let fbTokenForFrontend = null;

      try {
        console.log("🔁 Starting Focalboard sync...");
        console.log("📧 User email:", user.email);
        console.log("👤 User name:", user.name);

        const { username, password: fbPassword } =
          await ensureFocalboardUser(user);

        const fbSession = await loginFocalboard(username, fbPassword);
        console.log("🍪 Raw Focalboard session:", fbSession);

        if (fbSession) {
          console.log("✅ Focalboard session received");

          // Set cookie for browser
          const cookieValue = `${fbSession}; Domain=.onechatai.ai; Path=/; HttpOnly; Secure; SameSite=Lax`;
          console.log("🍪 Setting cookie:", cookieValue);

          res.setHeader("Set-Cookie", [cookieValue]);

          // Extract token
          if (fbSession.includes("FBSESSION=")) {
            fbTokenForFrontend = fbSession.split("FBSESSION=")[1].split(";")[0];
            console.log(
              "🎯 Extracted FB token for frontend:",
              fbTokenForFrontend,
            );
          } else {
            console.warn("⚠️ FBSESSION not found in cookie string");
          }
        } else {
          console.warn("⚠️ No Focalboard session returned");
        }
      } catch (fbErr) {
        console.error("❌ Focalboard sync failed");
        console.error("❌ Error message:", fbErr.message);
        console.error("❌ Full error:", fbErr);
      }

      res.json({
        success: true,
        message: "Login successful",
        token,
        fb_session_token: fbTokenForFrontend,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          age: user.age,
          region: user.region,
          gender: user.gender,
          name: user.name,
          email: user.email,
          plan: user.plan,
          remaining_tokens: user.remaining_tokens,
          roles: user.roles,
          status: user.status,
          profile_picture: user.profile_picture,
          authProvider: user.authProvider,
          video_credits: user.video_credits,
          image_credits: user.image_credits,
          hasSeenWelcomePopup: user.hasSeenWelcomePopup,
          payment_option: user.payment_option,
          isDiscountEligible: !user.has_used_trial && !user.has_paid_once,
        },
      });

      console.log("✅ Login successful for:", email);
    } catch (error) {
      console.error("🚨 Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login",
      });
    }
  },
);

// @desc    Google Authentication
// @route   POST /api/auth/google
// @access  Public
router.post("/google", handleGoogleAuth);

// @desc    Link Google account to existing account
// @route   POST /api/auth/link-google
// @access  Private
router.post("/link-google", protect, async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    const { verifyGoogleToken } = require("../middleware/google-auth");
    const verification = await verifyGoogleToken(idToken);

    if (!verification.success) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    const { googleId, email } = verification.payload;

    // Check if Google account is already linked to another user
    const existingGoogleUser = await User.findOne({ googleId });
    if (
      existingGoogleUser &&
      existingGoogleUser._id.toString() !== req.user.id
    ) {
      return res.status(400).json({
        success: false,
        message: "This Google account is already linked to another user",
      });
    }

    // Check if email matches current user
    if (email !== req.user.email) {
      return res.status(400).json({
        success: false,
        message: "Google account email must match your current account email",
      });
    }

    // Link Google account
    const user = await User.findById(req.user.id);
    user.googleId = googleId;
    user.emailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "Google account linked successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        googleId: user.googleId,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("Link Google account error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google account linking",
    });
  }
});

// @desc    Unlink Google account
// @route   DELETE /api/auth/unlink-google
// @access  Private
router.delete("/unlink-google", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.googleId) {
      return res.status(400).json({
        success: false,
        message: "No Google account is linked to this user",
      });
    }

    // Check if user has a password (can't unlink if Google is the only auth method)
    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message: "Cannot unlink Google account. Please set a password first.",
      });
    }

    user.googleId = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Google account unlinked successfully",
    });
  } catch (error) {
    console.error("Unlink Google account error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google account unlinking",
    });
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("history");

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        age: user.age,
        region: user.region,
        gender: user.gender,
        remaining_tokens: user.remaining_tokens,
        roles: user.roles,
        status: user.status,
        profile_picture: user.profile_picture,
        emailVerified: user.emailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        authProvider: user.authProvider,
        video_credits: user.video_credits,
        image_credits: user.image_credits,
        hasGoogleLinked: !!user.googleId,
        payment_option: user.payment_option,
        isDiscountEligible: !user.has_used_trial && !user.has_paid_once,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put("/profile", protect, async (req, res) => {
  try {
    const { name, profile_picture } = req.body;

    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (profile_picture) user.profile_picture = profile_picture;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        remaining_tokens: user.remaining_tokens,
        roles: user.roles,
        status: user.status,
        profile_picture: user.profile_picture,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during profile update",
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
router.put("/change-password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id).select("+password");

    // Check if user is Google-only user
    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message: "Cannot change password for Google-authenticated users",
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password change",
    });
  }
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    // Check if user is Google-only user
    if (user.authProvider === "google") {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google Sign-In. Password reset is not available.",
        authProvider: "google",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // In production, send email with reset link
    // For now, return the token (remove this in production)
    res.json({
      success: true,
      message: "Password reset token sent to email",
      resetToken: resetToken, // Remove this in production
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resettoken
// @access  Public
router.put("/reset-password/:resettoken", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resettoken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Generate new JWT token
    const token = await generateToken(user._id);

    res.json({
      success: true,
      message: "Password reset successful",
      token,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post("/logout", protect, (req, res) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
});

router.get("/check-guest-limit", async (req, res) => {
  try {
    // Extract IP address correctly (handles proxies/load balancers)
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    const usage = await GuestUsage.findOne({ ip });

    // If no record exists, they haven't used any tools yet
    if (!usage) {
      return res.json({ success: true, allowed: true, count: 0 });
    }

    // Check if limit is reached (using generation_count or api_count depending on what you increment)
    const currentCount = usage.generation_count; // or usage.api_count

    if (currentCount >= 5) {
      return res.json({ success: true, allowed: false, count: currentCount });
    }

    return res.json({ success: true, allowed: true, count: currentCount });
  } catch (error) {
    console.error("Check guest limit error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
