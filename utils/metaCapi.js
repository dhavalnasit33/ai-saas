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
 * Sends a Purchase conversion event to Meta Conversions API (CAPI).
 * @param {Object} user - The user document from MongoDB.
 * @param {string} stripeSessionId - The Stripe checkout session ID (used as event_id for dedup).
 * @param {number} [price=0] - The transaction value.
 */
async function sendMetaPurchaseEvent(user, stripeSessionId, price = 0) {
  const datasetId = process.env.META_DATASET_ID || "1529554822050763";
  const token = process.env.META_CAPI_ACCESS_TOKEN;

  if (!token) {
    console.warn("⚠️ Meta Conversions API credentials missing (META_CAPI_ACCESS_TOKEN). Skipping Meta Purchase CAPI event.");
    return;
  }

  const emailHash = user.email ? sha256(user.email) : "";

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

  const conversionValue = typeof price === "number" ? price : 0;

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000), // unix seconds
        action_source: "website",
        event_id: stripeSessionId, // idempotency & deduplication key
        event_source_url: "https://onechatai.ai/dashboard",
        user_data: {
          em: emailHash ? [emailHash] : undefined,
          client_ip_address: ipAddress || undefined,
          client_user_agent: userAgent || undefined,
          fbc: user.fbc || undefined,
          fbp: user.fbp || undefined,
        },
        custom_data: {
          currency: "USD",
          value: conversionValue, // 0 for trial start
        },
      },
    ],
  };

  // If a test event code is configured in .env, attach it to display in Real-time Test Events tab
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const v = "v25.0"; // current stable Graph API version
    const url = `https://graph.facebook.com/${v}/${datasetId}/events?access_token=${token}`;
    console.log(`[Meta CAPI] Sending Purchase event for user ${user.email} with value: ${conversionValue}, event_id: ${stripeSessionId}, fbc: ${user.fbc || "none"}`);

    const response = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("✅ [Meta CAPI] Purchase event sent successfully:", response.data);
  } catch (error) {
    console.error(
      "❌ [Meta CAPI] Error sending Purchase event:",
      error.response ? JSON.stringify(error.response.data) : error.message
    );
  }
}

module.exports = {
  sendMetaPurchaseEvent,
};
