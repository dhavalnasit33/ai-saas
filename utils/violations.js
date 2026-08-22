const crypto = require("crypto");
const ViolationEvent = require("../models/ViolationEvent");
const User = require("../models/User");
const emailService = require("./emailService");

/**
 * Creates a safe SHA-256 fingerprint hash of the prompt text.
 * Never stores raw bad prompt words to protect user privacy and company liability.
 * 
 * @param {string} text The prompt text.
 * @returns {string} The hashed prompt fingerprint.
 */
function hashText(text) {
  return "sha256:" + crypto.createHash("sha256")
    .update(text || "")
    .digest("hex");
}

/**
 * Saves a content safety violation event to the database.
 * If category is sexual/minors, suspends the user account immediately, sends an email alert to Habib (CEO),
 * and omits prompt hashing for privacy/legal compliance.
 * 
 * @param {object} params
 * @param {string} params.userId User ID of the offender.
 * @param {string[]} params.categories List of flagged categories.
 * @param {object} params.scores Scores object returned by OpenAI Moderation.
 * @param {string} params.tool Name of the tool where violation happened.
 * @param {string} params.source Source of the block (e.g. 'input_check', 'output_check', 'provider_reject').
 * @param {string} params.promptText Raw prompt text (only hash is saved, omitted for minors).
 */
async function saveViolation({ userId, categories, scores, tool, source, promptText }) {
  try {
    // Map scores to a clean key-value format for Mongoose Map field
    const cleanScores = {};
    if (scores) {
      for (const [key, value] of Object.entries(scores)) {
        if (typeof value === "number") {
          cleanScores[key] = value;
        }
      }
    }

    const isChildSafety = (categories || []).some(c =>
      c.includes("minors") || c.includes("child")
    );

    let promptHash = hashText(promptText);

    // ZERO TOLERANCE: Child Safety Enforcement
    if (isChildSafety) {
      promptHash = "omitted_for_child_safety_compliance";

      if (userId) {
        await User.findByIdAndUpdate(userId, { status: "suspended" }).catch(err => {
          console.error("Failed to suspend user for child safety violation:", err.message);
        });
      }

      // Send immediate email alert to Habib (CEO)
      emailService.sendChildSafetyAlertToCEO({
        userId: userId || "anonymous",
        categories,
        scores: cleanScores,
        timestamp: new Date(),
      }).catch(err => {
        console.error("Failed to dispatch email alert to CEO:", err.message);
      });
    }

    await ViolationEvent.create({
      userId: userId,
      categories: categories || [],
      scores: cleanScores,
      tool: tool || "unknown",
      source: source || "input_check",
      action: "blocked",
      promptHash: promptHash,
    });
  } catch (error) {
    console.error("Failed to save violation event:", error.message);
  }
}

/**
 * Counts content safety violations for a single user in the last 30 days.
 * 
 * @param {string} userId The User ID.
 * @returns {Promise<number>} Number of violations.
 */
async function countViolations(userId) {
  try {
    if (!userId) return 0;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return await ViolationEvent.countDocuments({
      userId: userId,
      createdAt: { $gte: since },
    });
  } catch (error) {
    console.error("Failed to count violations for user:", error.message);
    return 0;
  }
}

/**
 * Checks a user's violation count in the last 30 days and enforces repeat offender penalties.
 * Auto-suspends user if 5 or more violations occur in 30 days.
 * 
 * @param {string} userId The User ID.
 * @returns {Promise<{banned: boolean, warning: boolean, count: number, status: string}>}
 */
async function checkUserViolationStatus(userId) {
  if (!userId) {
    return { banned: false, warning: false, count: 0, status: "active" };
  }

  const count = await countViolations(userId);

  if (count >= 5) {
    await User.findByIdAndUpdate(userId, { status: "suspended" }).catch(err => {
      console.error("Failed to suspend repeat offender user:", err.message);
    });
    return { banned: true, warning: true, count, status: "suspended" };
  }

  if (count >= 3) {
    return { banned: false, warning: true, count, status: "active" };
  }

  return { banned: false, warning: false, count, status: "active" };
}

/**
 * Decides which message to return based on the violation categories.
 * 
 * @param {string[]} categories The blocked categories list.
 * @returns {object} Message details block response.
 */
function getBlockMessage(categories) {
  const selfHarm = (categories || []).some(c =>
    c.includes("self-harm") || c.includes("suicide")
  );

  if (selfHarm) {
    return {
      type: "self_harm",
      message: "Our safety systems have flagged this request as possibly related to " +
        "self-harm, and we're unable to process it. We make this decision out of " +
        "deep care for your safety. If you're going through something difficult, " +
        "you don't have to face it alone — support is available, and the resources " +
        "below are free, confidential, and there for you. If you believe this was " +
        "a mistake, please rephrase your request and try again.",
      resourceText: "Find a helpline in your country:",
      resourceUrl: "https://findahelpline.com",
    };
  }

  return {
    type: "policy",
    message: "For your own safety, the safety of our users, and the general public, " +
      "we can't complete this request as it goes against our content policy. " +
      "If you believe this was a mistake, please rephrase and try again. " +
      "We apologize for the inconvenience.",
  };
}

module.exports = {
  saveViolation,
  countViolations,
  checkUserViolationStatus,
  getBlockMessage,
  hashText,
};
