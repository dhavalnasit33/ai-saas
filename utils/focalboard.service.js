const axios = require("axios");
const crypto = require("crypto");

const FOCALBOARD_URL = "https://project.onechatai.ai";
const INVITE_TOKEN = "kpfbnmpnqutgzbcg699ftmde9fr";

const FOCALBOARD_ADMIN_EMAIL = "dhavalnasit3@gmail.com";
const FOCALBOARD_ADMIN_USERNAME = "dhavalnasit3@gmail.com";
const FOCALBOARD_ADMIN_PASSWORD = process.env.FB_ADMIN_PASSWORD;

/* =========================================
   Generate deterministic Focalboard password
========================================= */
function generateFocalboardPassword(email) {
  return crypto
    .createHmac("sha256", process.env.FOCALBOARD_SECRET)
    .update(email.toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

function generateFbPasswordOld(email) {
  return crypto
    .createHash("sha256")
    .update(email + process.env.JWT_SECRET)
    .digest("hex")
    .slice(0, 16);
}

/* =========================================
   Ensure user exists in Focalboard
========================================= */
async function ensureFocalboardUser(email) {
  // Admin shortcut
  if (email === FOCALBOARD_ADMIN_EMAIL) {
    return {
      username: FOCALBOARD_ADMIN_USERNAME,
      password: FOCALBOARD_ADMIN_PASSWORD,
    };
  }

  const username = email; // ✅ EMAIL AS USERNAME
  const password = generateFocalboardPassword(email);
  const oldPassword = generateFbPasswordOld(email);

  // 1️⃣ Try login with NEW password
  try {
    const session = await loginFocalboard(username, password);
    if (session) {
      console.log("✅ Focalboard user exists — login OK with new password");
      return { username, password };
    }
  } catch (_) {
    // Continue
  }

  // 2️⃣ Try login with OLD password & migrate if successful
  try {
    const session = await loginFocalboard(username, oldPassword);
    if (session) {
      console.log("✅ Focalboard login OK with old password. Migrating to new password...");
      const token = session.split("FBSESSION=")[1];
      
      // Fetch userID
      const meRes = await axios.get(`${FOCALBOARD_URL}/api/v2/users/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const userID = meRes.data.id;

      // Update password to new one
      await axios.post(
        `${FOCALBOARD_URL}/api/v2/users/${userID}/changepassword`,
        {
          currentPassword: oldPassword,
          newPassword: password,
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        },
      );
      console.log("🎯 Successfully migrated Focalboard password to new formula for:", email);
      return { username, password };
    }
  } catch (_) {
    // Continue
  }

  // 3️⃣ Try login with OLD split username + OLD password & migrate if successful
  const oldUsername = email.split("@")[0];
  try {
    const session = await loginFocalboard(oldUsername, oldPassword);
    if (session) {
      console.log("✅ Focalboard login OK with old split username. Migrating to new password...");
      const token = session.split("FBSESSION=")[1];
      
      // Fetch userID
      const meRes = await axios.get(`${FOCALBOARD_URL}/api/v2/users/me`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const userID = meRes.data.id;

      // Update password to new one
      await axios.post(
        `${FOCALBOARD_URL}/api/v2/users/${userID}/changepassword`,
        {
          currentPassword: oldPassword,
          newPassword: password,
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        },
      );
      console.log("🎯 Successfully migrated split username Focalboard password for:", email);
      return { username: oldUsername, password };
    }
  } catch (_) {
    // Continue
  }

  // 4️⃣ Try login with OLD split username + NEW password (if already migrated but keeping username)
  try {
    const session = await loginFocalboard(oldUsername, password);
    if (session) {
      console.log("✅ Focalboard login OK with split username and new password");
      return { username: oldUsername, password };
    }
  } catch (_) {
    // Continue
  }

  // 5️⃣ Register user if all logins fail
  console.log("🔸 User not found on Focalboard, registering...");
  try {
    await axios.post(
      `${FOCALBOARD_URL}/api/v2/register?token=${INVITE_TOKEN}`,
      {
        email,
        username,
        password,
        token: INVITE_TOKEN,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );

    console.log("✅ Focalboard user registered");
  } catch (err) {
    if (err.response?.data?.error === "The username already exists") {
      console.log("ℹ️ Username already exists — continuing");
    } else if (err.response?.data?.error === "The email already exists") {
      console.log("ℹ️ Email already exists — continuing");
    } else {
      throw err;
    }
  }

  return { username, password };
}

/* =========================================
   Login to Focalboard
========================================= */
async function loginFocalboard(username, password) {
  try {
    const response = await axios.post(
      `${FOCALBOARD_URL}/api/v2/login`,
      {
        username,
        password,
        type: "normal",
      },
      {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Origin: FOCALBOARD_URL,
        },
      },
    );

    // Token in body
    if (response.data?.token) {
      return `FBSESSION=${response.data.token}`;
    }

    // Token in cookie
    const cookies = response.headers["set-cookie"];
    if (Array.isArray(cookies)) {
      const fb = cookies.find((c) => c.startsWith("FBSESSION="));
      if (fb) return fb.split(";")[0];
    }

    return null;
  } catch (err) {
    console.error(
      "⚠️ Focalboard login failed:",
      err.response?.data || err.message,
    );
    return null;
  }
}

module.exports = {
  ensureFocalboardUser,
  loginFocalboard,
  generateFocalboardPassword,
};

// const axios = require("axios");
// const crypto = require("crypto");

// const FOCALBOARD_URL = "https://project.onechatai.ai";
// const INVITE_TOKEN = "ka5cjc6qqutyafkxxr9rm5awpqa";

// const FOCALBOARD_ADMIN_EMAIL = "dhavalnasit33@gmail.com";
// const FOCALBOARD_ADMIN_USERNAME = "Dhaval";
// const FOCALBOARD_ADMIN_PASSWORD = process.env.FB_ADMIN_PASSWORD;

// /* =========================================================
//    Helpers
// ========================================================= */

// // Deterministic password (SSO-style)
// function generateFbPassword(email) {
//   return crypto
//     .createHash("sha256")
//     .update(email + process.env.JWT_SECRET)
//     .digest("hex")
//     .slice(0, 16);
// }

// // ✅ USERNAME = firstName_lastName (THIS IS THE ONLY CHANGE)
// function buildUsername(firstName, lastName, email) {
//   if (firstName && lastName) {
//     return `${firstName}_${lastName}`.toLowerCase().replace(/\s+/g, "");
//   }
//   return email.split("@")[0];
// }

// /* =========================================================
//    Ensure user exists
// ========================================================= */
// async function ensureFocalboardUser(user) {
//   const { email, firstName, lastName } = user;

//   // Admin shortcut
//   if (email === FOCALBOARD_ADMIN_EMAIL) {
//     return {
//       password: FOCALBOARD_ADMIN_PASSWORD,
//       username: FOCALBOARD_ADMIN_USERNAME,
//     };
//   }

//   const password = generateFbPassword(email);
//   const username = buildUsername(firstName, lastName, email);

//   console.log("🔹 Ensuring Focalboard user:", { email, username });

//   // 1️⃣ Try login first
//   try {
//     await axios.post(
//       `${FOCALBOARD_URL}/api/v2/login`,
//       {
//         username,
//         password,
//         type: "normal",
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "X-Requested-With": "XMLHttpRequest",
//         },
//       }
//     );

//     console.log("✅ Focalboard user exists");
//     return { password, username };
//   } catch (_) {
//     console.log("🔸 User not found, registering...");
//   }

//   // 2️⃣ Register (invite-token flow)
//   const dd = await axios.post(
//     `${FOCALBOARD_URL}/api/v2/register?token=${INVITE_TOKEN}`,
//     {
//       email,
//       username,
//       password,
//       token: INVITE_TOKEN,
//     },
//     {
//       headers: {
//         "Content-Type": "application/json",
//         "X-Requested-With": "XMLHttpRequest",
//       },
//     }
//   );
//   console.log("dd", dd);
//   console.log("✅ Focalboard user registered");
//   return { password, username };
// }

// /* =========================================================
//    Login to Focalboard
// ========================================================= */
// async function loginFocalboard(username, password) {
//   console.log("🔐 Logging into Focalboard:", username);

//   const response = await axios.post(
//     `${FOCALBOARD_URL}/api/v2/login`,
//     {
//       username,
//       password,
//       type: "normal",
//     },
//     {
//       withCredentials: true,
//       headers: {
//         "Content-Type": "application/json",
//         "X-Requested-With": "XMLHttpRequest",
//         Origin: FOCALBOARD_URL,
//       },
//     }
//   );

//   // Token in body
//   if (response.data?.token) {
//     return `FBSESSION=${response.data.token}`;
//   }

//   // Token in cookie
//   const setCookie = response.headers["set-cookie"];
//   if (Array.isArray(setCookie)) {
//     const fb = setCookie.find((c) => c.startsWith("FBSESSION="));
//     if (fb) return fb.split(";")[0];
//   }

//   return null;
// }

// module.exports = {
//   ensureFocalboardUser,
//   loginFocalboard,
// };
