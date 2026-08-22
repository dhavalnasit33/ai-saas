const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyCaptcha } = require("./recaptcha");
const {
  ensureFocalboardUser,
  loginFocalboard,
} = require("../utils/focalboard.service");
const crypto = require("crypto");
const Setting = require("../models/Setting");
const { getDeviceInfo } = require("../utils/deviceInfo");

// Initialize Google OAuth client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT Token (same as existing auth)
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
// Verify Google ID Token
const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    return {
      success: true,
      payload: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        firstName: payload.given_name,
        lastName: payload.family_name,
        picture: payload.picture,
        emailVerified: payload.email_verified,
      },
    };
  } catch (error) {
    console.error("Google token verification failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const handleGoogleAuth = async (req, res) => {
  try {
    const { idToken, region } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    const currentDeviceInfo = getDeviceInfo(req);
    // Verify Google token
    const verification = await verifyGoogleToken(idToken);

    if (!verification.success) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
        error: verification.error,
      });
    }

    const {
      googleId,
      email,
      name,
      firstName,
      lastName,
      picture,
      emailVerified,
    } = verification.payload;

    // Check if user exists with this email
    const user = await User.findOne({ email });

    if (user) {
      // User exists - update Google info if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        user.emailVerified = emailVerified;
        if (!user.profile_picture && picture) {
          user.profile_picture = picture;
        }
        await user.save();
      }

      // Update last login
      user.lastLogin = new Date();
      user.devices.push(currentDeviceInfo);

      if (user.devices.length > 5) {
        user.devices.shift();
      }

      await user.save();

      // Generate JWT token
      const token = await generateToken(user._id);

      let fbTokenForFrontend = null;
      try {
        // const fbPassword = generateFocalboardPassword(user.email);

        const { username, password: fbPassword } =
          await ensureFocalboardUser(email);

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
        console.error("Focalboard sync failed (Google Login):", fbErr.message);
      }

      return res.json({
        success: true,
        message: "Google login successful",
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
          emailVerified: user.emailVerified,
          region: user.region,
          gender: user.gender,
          age: user.age,
          video_credits: user.video_credits,
          image_credits: user.image_credits,
          hasSeenWelcomePopup: user.hasSeenWelcomePopup,
          payment_option: user.payment_option,
          isDiscountEligible: !user.has_used_trial && !user.has_paid_once,
        },
        isNewUser: false,
      });
    } else {
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

      // Create new user with Google info
      const newUser = await User.create({
        name: name || `${firstName} ${lastName}`.trim(),
        firstName: firstName || "",
        lastName: lastName || "",
        email,
        // password: "google_auth_" + Math.random().toString(36).substring(7),
        googleId,
        profile_picture: picture,
        emailVerified: emailVerified,
        lastLogin: new Date(),
        region: region || "Unknown",
        gender: "other",
        roles: ["User"],
        age: 18,
        authProvider: "google",
        devices: [currentDeviceInfo],
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

      // Generate JWT token
      const token = await generateToken(newUser._id);

      // --- FOCALBOARD INTEGRATION ---
      let fbTokenForFrontend = null;
      try {
        // const fbPassword = generateFocalboardPassword(newUser.email);

        const { username, password: fbPassword } =
          await ensureFocalboardUser(email);
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
        console.error(
          "Focalboard sync failed (Google Register):",
          fbErr.message,
        );
      }
      // -----------------------------

      return res.status(201).json({
        success: true,
        message: "Google registration successful",
        token,
        fb_session_token: fbTokenForFrontend,
        user: {
          id: newUser._id,
          name: newUser.name,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          plan: newUser.plan,
          remaining_tokens: newUser.remaining_tokens,
          roles: newUser.roles,
          status: newUser.status,
          profile_picture: newUser.profile_picture,
          emailVerified: newUser.emailVerified,
          region: newUser.region,
          gender: newUser.gender,
          age: newUser.age,
          video_credits: newUser.video_credits,
          image_credits: newUser.image_credits,
          hasSeenWelcomePopup: newUser.hasSeenWelcomePopup,
          payment_option: newUser.payment_option,
          isDiscountEligible: !newUser.has_used_trial && !newUser.has_paid_once,
        },
        isNewUser: true,
      });
    }
  } catch (error) {
    console.error("Google authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google authentication",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  verifyGoogleToken,
  handleGoogleAuth,
  generateToken,
};
