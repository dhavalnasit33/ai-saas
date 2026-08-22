const axios = require("axios");
const crypto = require("crypto");

// Helper function to hash data with SHA-256
function sha256(text) {
  console.log("[SHA256] Input:", text);

  if (!text) {
    console.log("[SHA256] Empty input");
    return "";
  }

  const hashed = crypto
    .createHash("sha256")
    .update(text.trim().toLowerCase())
    .digest("hex");

  console.log("[SHA256] Output:", hashed);

  return hashed;
}

// Function to get Google OAuth Access Token via Refresh Token
async function getGoogleAccessToken() {
  console.log("===========================================");
  console.log("[Google OAuth] Getting Access Token...");
  console.log("===========================================");

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  console.log("[Google OAuth] CLIENT_ID Exists:", !!clientId);
  console.log("[Google OAuth] CLIENT_SECRET Exists:", !!clientSecret);
  console.log("[Google OAuth] REFRESH_TOKEN Exists:", !!refreshToken);

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google OAuth credentials (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, or GOOGLE_OAUTH_REFRESH_TOKEN)",
    );
  }

  console.log("[Google OAuth] Requesting Access Token...");

  const response = await axios.post("https://oauth2.googleapis.com/token", {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  console.log("[Google OAuth] Response:", response.data);
  console.log("[Google OAuth] Access Token Received");

  return response.data.access_token;
}

// Helper to format date
function formatGoogleDateTime(d) {
  console.log("[Date] Formatting Date:", d);
  const formatted = d.toISOString();
  console.log("[Date] Formatted:", formatted);
  return formatted;
}

/**
 * Sends SignUp Conversion Event
 */
async function sendGoogleSignUpEvent(user, session) {
  console.log("\n");
  console.log("===========================================");
  console.log("[Google Ads CAPI] START");
  console.log("===========================================");

  console.log("[User]");
  console.log(user);

  console.log("[Session]");
  console.log(session);

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const conversionResource = process.env.GOOGLE_SIGNUP_CONVERSION_RESOURCE;

  console.log("[ENV] Developer Token Exists:", !!developerToken);
  console.log("[ENV] Conversion Resource:", conversionResource);

  if (!developerToken || !conversionResource) {
    console.warn(
      "⚠️ Google Ads Developer Token or Conversion Action Resource missing.",
    );
    return;
  }

  try {
    console.log("===========================================");
    console.log("[STEP 1] Getting OAuth Token");
    console.log("===========================================");

    const accessToken = await getGoogleAccessToken();

    console.log("[STEP 1] Access Token Length:", accessToken.length);

    console.log("===========================================");
    console.log("[STEP 2] Extract Customer ID");
    console.log("===========================================");

    let customerId = "4064885227";

    const resourceParts = conversionResource.split("/");

    console.log("[Conversion Resource Parts]");
    console.log(resourceParts);

    if (resourceParts.length > 1 && resourceParts[0] === "customers") {
      customerId = resourceParts[1];
    }

    console.log("[Customer ID]", customerId);

    console.log("===========================================");
    console.log("[STEP 3] Build Payload");
    console.log("===========================================");

    const payload = {
      destinations: [
        {
          productDestinationId: conversionResource,
          operatingAccount: {
            accountId: customerId,
            accountType: "GOOGLE_ADS",
          },
        },
      ],
      events: [
        {
          eventName: "Sign Up — Trial Start",
          eventTimestamp: formatGoogleDateTime(new Date()),
          eventSource: "WEB",
          adIdentifiers: {
            gclid: user.gclid || undefined,
            gbraid: user.gbraid || undefined,
            wbraid: user.wbraid || undefined,
          },
          userData: {
            userIdentifiers: [
              user.email
                ? {
                    emailAddress: sha256(user.email),
                  }
                : null,
            ].filter(Boolean),
          },
          conversionValue: 1.0,
          currency: "USD",
          transactionId: session.id,
        },
      ],
    };

    console.log("[Payload]");
    console.log(JSON.stringify(payload, null, 2));

    console.log("===========================================");
    console.log("[STEP 4] Sending Request");
    console.log("===========================================");

    const url = "https://datamanager.googleapis.com/v1/events:ingest";

    console.log("[URL]", url);

    // Extract Google Cloud Project Number from GOOGLE_OAUTH_CLIENT_ID (prefix digits before the hyphen)
    let quotaProjectId = undefined;
    const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (oauthClientId) {
      const parts = oauthClientId.split("-");
      if (parts.length > 0 && /^\d+$/.test(parts[0])) {
        quotaProjectId = parts[0];
      }
    }
    const userProjectHeader = quotaProjectId || customerId;

    console.log("[Headers]");
    console.log({
      Authorization: "Bearer " + accessToken.substring(0, 20) + "...",
      "developer-token": developerToken,
      "x-goog-user-project": userProjectHeader,
      "Content-Type": "application/json",
    });

    console.log("[Sending API Request...]");

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "x-goog-user-project": userProjectHeader,
        "Content-Type": "application/json",
      },
    });

    console.log("===========================================");
    console.log("✅ SUCCESS");
    console.log("===========================================");

    console.log("[Status]", response.status);

    console.log("[Response Headers]");
    console.log(response.headers);

    console.log("[Response Data]");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log("===========================================");
    console.log("❌ ERROR");
    console.log("===========================================");

    console.log("[Error Message]");
    console.log(error.message);

    if (error.code) {
      console.log("[Error Code]");
      console.log(error.code);
    }

    if (error.response) {
      console.log("[HTTP Status]");
      console.log(error.response.status);

      console.log("[Response Headers]");
      console.log(error.response.headers);

      console.log("[Response Data]");
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      console.log("[No Response Received]");
    }

    console.log("[Stack]");
    console.log(error.stack);
  }

  console.log("===========================================");
  console.log("[Google Ads CAPI] END");
  console.log("===========================================");
}

module.exports = {
  sendGoogleSignUpEvent,
  getGoogleAccessToken,
};
