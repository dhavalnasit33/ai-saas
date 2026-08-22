const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AdminUser = require("../models/AdminUser");
const GuestUsage = require("../models/GuestUsage");
const Setting = require("../models/Setting");

// // Protect routes - require authentication
// exports.protect = async (req, res, next) => {
//   try {
//     const guestLimit = 5;
//     const ip = getClientIp(req);
//     console.log('User IP:', ip);

//     let token;

//     if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
//       token = req.headers.authorization.split(' ')[1];
//     }

//     // No token → Proceed with guest flow
//     if (!token) {
//       let guest = await GuestUsage.findOne({ ip });

//       if (!guest) {
//         guest = await GuestUsage.create({ ip, api_count: 1 });
//         console.log('Guest created:', guest);
//       } else {
//         if (guest.api_count >= guestLimit) {
//           return res.status(429).json({
//             success: false,
//             message: 'Guest request limit reached. Please login to continue.',
//           });
//         }

//         guest.api_count += 1;
//         guest.last_used = new Date();
//         await guest.save();
//       }

//       req.user = null;
//       req.guest = true;
//       return next();
//     }

//     // Token is present → Validate JWT format before verifying
//     if (token.split('.').length !== 3) {
//       console.error('JWT malformed: Incorrect format');
//       return res.status(401).json({
//         success: false,
//         message: 'Malformed token format.',
//       });
//     }

//     // Verify the token
//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (jwtError) {
//       console.error('JWT verification failed:', jwtError.message);
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid or malformed token.',
//       });
//     }

//     // Find user by decoded token ID
//     const user = await User.findById(decoded.id).select('-password');
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid token. User not found.',
//       });
//     }

//     if (user.status !== 'active') {
//       return res.status(401).json({
//         success: false,
//         message: 'Account is suspended or inactive.',
//       });
//     }

//     req.user = user;
//     req.guest = false;
//     next();
//   } catch (error) {
//     console.error('Auth middleware error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error during authentication.',
//     });
//   }
// };

const GUEST_API_LIMIT = 50000;
const BASIC_PLAN_DAILY_LIMIT = 100000;

const getClientIp = (req) => {
  // Get the IP from headers (if behind proxy) or socket/connection
  let ip =
    req.headers["cf-connecting-ip"] || // Cloudflare (if used)
    req.headers["x-forwarded-for"]?.split(",")[0] || // Nginx / Proxy
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress;

  // Normalize IPv6 localhost (::1) to IPv4
  if (ip === "::1") ip = "127.0.0.1";

  // Normalize IPv4-mapped IPv6 (::ffff:127.0.0.1) to IPv4
  if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  return ip;
};

exports.protect = async (req, res, next) => {
  try {
    let token;
    let decoded;
    let user = null;
    console.log("token", token);
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (token) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);

        user = await User.findById(decoded.id).select("-password");
        const versionSetting = await Setting.findOne({ key: "web_version" });
        if (versionSetting && decoded.web_version !== versionSetting.value) {
          return res.status(401).json({
            success: false,
            message: "New version released. Please login again.",
            forceLogout: true,
          });
        }

        if (user && user.forceLogoutDate) {
          const tokenIssuedAt = decoded.iat * 1000; // Convert to milliseconds
          if (tokenIssuedAt < user.forceLogoutDate.getTime()) {
            return res.status(401).json({
              success: false,
              message:
                "Your session was expired by an Administrator. Please log in again.",
              forceLogout: true, // Send this to help frontend interceptors
            });
          }
        }
        if (user && user.status === "suspended") {
          return res.status(403).json({
            blocked: true,
            type: "account_suspended",
            message: "Your account has been suspended due to violations of our Content Safety Policy. Please contact support for assistance.",
          });
        }

        if (user && user.status === "active") {
          req.user = user;
          req.guest = false;

          // ----- Handle Basic Plan daily limit -----
          if (user.plan === "basic") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Reset daily count if it's a new day
            if (!user.daily_usage || user.daily_usage.date < today) {
              user.daily_usage = { count: 0, date: today };
            }

            if (user.daily_usage.count >= BASIC_PLAN_DAILY_LIMIT) {
              return res.status(403).json({
                success: false,
                message: `You have reached your daily limit of ${BASIC_PLAN_DAILY_LIMIT} for the Basic Plan.`,
              });
            }

            // Increment daily usage
            user.daily_usage.count += 1;
            await user.save();
          }

          return next();
        } else {
          console.warn(`User inactive or not found: ${decoded.id}`);
          req.user = null;
          req.guest = true;
        }
      } catch (err) {
        console.warn(`Invalid token or user fetch failed: ${err.message}`);
        req.user = null;
        req.guest = true;
      }
    } else {
      req.user = null;
      req.guest = true;
    }

    // Handle guest user case
    const ip = getClientIp(req);

    let guestUsage = await GuestUsage.findOne({ ip });
    if (!guestUsage) {
      guestUsage = await GuestUsage.create({ ip, api_count: 0, generation_count: 0 });
    }

    const isUserWiseEndpoint = req.path === "/user-wise";
    const isGenerationEndpoint = 
      req.originalUrl.includes('/generate') || 
      req.originalUrl.includes('/use-topic') || 
      req.originalUrl.includes('/use-tab') || 
      req.originalUrl.includes('/ai/general') ||
      req.originalUrl.includes('/ai/title') ||
      req.originalUrl.includes('/keyword');

    if (isGenerationEndpoint) {
      if (guestUsage.generation_count >= 5) {
        return res.status(403).json({
          success: false,
          message: "You've reached your lifetime free usage limit of 5 generations as a guest user. Please create a free account to continue.",
          requiresLogin: true
        });
      }
      guestUsage.generation_count += 1;
    } else {
      if (!isUserWiseEndpoint && guestUsage.api_count >= GUEST_API_LIMIT) {
        return res.status(403).json({
          success: false,
          message:
            "You’ve reached your free token usage limit as a guest user. Please create a free account to continue.",
        });
      }
      guestUsage.api_count += 1;
    }

    guestUsage.last_used = new Date();
    await guestUsage.save();

    req.guestUser = guestUsage;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication.",
    });
  }
};

// Check if user has required role
exports.authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login first.",
      });
    }
    // Admin has access to everything
    if (
      req.user.roles.includes("Admin") ||
      req.user.roles.includes("Admin_user")
    ) {
      return next();
    }

    // check user id includer in admin user collection
    // const AdminUser = require('../models/AdminUser');
    const adminUser = await AdminUser.findOne({
      user_id: req.user.id,
      is_active: true,
    }).populate("user_id", "name email roles");
    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    if (adminUser.is_active) {
      return next();
    }

    // Check if user has any of the required roles
    const hasRole = roles.some((role) => req.user.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

// Check specific permissions
exports.checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Access denied. Please login first.",
        });
      }

      // Admin has all permissions
      if (req.user.roles.includes("Admin")) {
        return next();
      }

      const AdminUser = require("../models/AdminUser");
      const adminUser = await AdminUser.findOne({
        user_id: req.user.id,
        is_active: true,
      });

      if (!adminUser) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin privileges required.",
        });
      }

      if (!adminUser.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`,
        });
      }

      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during permission check.",
      });
    }
  };
};

// Check if user has enough tokens
exports.checkTokens = (tokensRequired = 1) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login first.",
      });
    }

    if (req.user.remaining_tokens < tokensRequired) {
      return res.status(403).json({
        success: false,
        message: "Insufficient tokens. Please upgrade your plan.",
        remaining_tokens: req.user.remaining_tokens,
        required_tokens: tokensRequired,
      });
    }

    next();
  };
};
