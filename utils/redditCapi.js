const axios = require("axios");
const crypto = require("crypto");

// Helper function to hash data with SHA-256
function sha256(text) {
  if (!text) return "";
  return crypto
    .createHash("sha256")
    .update(text.trim().toLowerCase())
    .digest("hex");
}

/**
 * Sends a SignUp conversion event to the Reddit Conversions API (CAPI).
 * @param {Object} user - The user document from MongoDB.
 * @param {string} stripeSessionId - The Stripe checkout session ID (used as deduplication conversion_id).
 * @param {number} [price=0] - The transaction value.
 */
async function sendRedditSignUpEvent(user, stripeSessionId, price = 0) {
  // Retrieve CAPI credentials (endpoint expects Pixel ID in path)
  const pixelId = process.env.REDDIT_PIXEL_ID || process.env.REDDIT_AD_ACCOUNT_ID || "";
  const token = process.env.REDDIT_CAPI_ACCESS_TOKEN || "";

  if (!pixelId || !token) {
    console.warn("⚠️ Reddit Ads credentials missing (REDDIT_PIXEL_ID or REDDIT_CAPI_ACCESS_TOKEN). Skipping CAPI SignUp event.");
    return;
  }

  // Get matching user identifiers
  const emailHash = sha256(user.email);
  
  // Use signupIp/UA first, fall back to devices array if needed
  let ipAddress = user.signupIp || "";
  let userAgent = user.signupUserAgent || "";

  if (!ipAddress || !userAgent) {
    if (user.devices && user.devices.length > 0) {
      const latestDevice = user.devices[user.devices.length - 1];
      ipAddress = ipAddress || latestDevice.ip || "";
      userAgent = userAgent || latestDevice.userAgent || "";
    }
  }

  const conversionValue = typeof price === 'number' ? price : 0;

  let clickId = user.rdt_cid || undefined;
  let testId = process.env.REDDIT_TEST_ID || undefined;

  // Auto-detect if user passed a Reddit test ID (t2_...) in rdt_cid
  if (clickId && clickId.startsWith("t2_")) {
    testId = clickId;
    clickId = undefined; // Clear click_id to prevent "Invalid click ID" error
  }

  const payload = {
    events: [
      {
        event_at: new Date().toISOString(),
        event_type: { tracking_type: "SignUp" },
        click_id: clickId,
        event_metadata: {
          conversion_id: stripeSessionId,
          currency: "USD",
          value_decimal: conversionValue
        },
        user: {
          email: emailHash,
          ip_address: ipAddress || undefined,
          user_agent: userAgent || undefined
        }
      }
    ]
  };

  if (testId) {
    payload.test_id = testId;
    console.log(`[Reddit CAPI] Attaching test_id: ${testId}`);
  }

  try {
    const url = `https://ads-api.reddit.com/api/v2.0/conversions/events/${pixelId}`;
    console.log(`[Reddit CAPI] Sending SignUp event for user ${user.email} with value: ${conversionValue}, click_id: ${user.rdt_cid || 'none'}, pixel_id: ${pixelId}`);
    
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    console.log("✅ [Reddit CAPI] SignUp event sent successfully:", response.data);
  } catch (error) {
    console.error(
      "❌ [Reddit CAPI] Error sending SignUp event:",
      error.response ? JSON.stringify(error.response.data) : error.message
    );
  }
}

module.exports = {
  sendRedditSignUpEvent
};
