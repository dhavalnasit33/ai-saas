const { OpenAI } = require("openai");
const AIProvider = require("../models/AIProvider");

/**
 * Runs moderation safety check on text prompt and/or image url.
 * Uses OpenAI's omni-moderation-latest model with balanced scoring logic:
 * - 100% BLOCKS: Nudity, Sexual content, Minors, Self-harm, Hate speech, Harassment, Illicit/Illegal acts.
 * - 100% BLOCKS: Extreme graphic violence / real-world gore (> 0.88 score).
 * - ALLOWS: Harmless creative prompts, Scenery, Awareness videos, Anime & Fantasy action battles (e.g. Demon Hunter, Naruto).
 * 
 * @param {string} prompt Text prompt to moderate.
 * @param {string|null} imageUrl Image URL (or base64 Data URI) to moderate.
 * @returns {Promise<{allow: boolean, categories: string[], scores: Object}>}
 */
async function checkSafety(prompt, imageUrl = null) {
  try {
    // 1. Fetch OpenAI provider dynamically from database
    const provider = await AIProvider.findOne({
      name: "openai",
      is_active: true,
    }).select("+api_key");

    if (!provider || !provider.api_key) {
      console.warn("⚠️ OpenAI provider not configured/active in DB. Bypassing safety check.");
      return { allow: true, categories: [], scores: {} };
    }

    const openai = new OpenAI({
      apiKey: provider.api_key.trim(),
      baseURL: provider.base_url || "https://api.openai.com/v1",
    });

    // 2. Prepare inputs for Moderation API
    const input = [];
    if (prompt && typeof prompt === "string" && prompt.trim().length > 0) {
      input.push({ type: "text", text: prompt.trim() });
    }
    if (imageUrl && typeof imageUrl === "string" && imageUrl.trim().length > 0) {
      const trimmedUrl = imageUrl.trim();
      // OpenAI Moderation API only supports HTTP image URLs or 'data:image/...' base64 URIs
      if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://") || trimmedUrl.startsWith("data:image/")) {
        input.push({ type: "image_url", image_url: { url: trimmedUrl } });
      }
    }

    // If nothing to moderate, return true
    if (input.length === 0) {
      return { allow: true, categories: [], scores: {} };
    }

    // 3. Call OpenAI omni-moderation API
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: input,
    });

    const result = moderation.results[0];

    if (result) {
      const categories = result.categories || {};
      const scores = result.category_scores || {};

      // 🛑 1. STRICT SCORE THRESHOLDS (Zero Tolerance Categories):
      // Catches rephrased & sneaky prompts for Nudity/Sexual, Minors, Self-Harm, Hate, Illicit Acts
      const STRICT_THRESHOLDS = {
        "sexual": 0.08,
        "sexual/nudity": 0.08,
        "sexual/minors": 0.02,
        "self-harm": 0.08,
        "self-harm/intent": 0.08,
        "self-harm/instructions": 0.08,
        "hate": 0.15,
        "hate/threatening": 0.15,
        "harassment": 0.20,
        "harassment/threatening": 0.20,
        "illicit": 0.15,
        "illicit/violent": 0.15,
      };

      for (const [cat, threshold] of Object.entries(STRICT_THRESHOLDS)) {
        if (scores[cat] !== undefined && scores[cat] > threshold) {
          return {
            allow: false,
            categories: [cat],
            scores: scores,
          };
        }
      }

      // 🛑 2. DEFAULT BOOLEAN HARD BLOCK FALLBACK
      const isHardBlock = Object.keys(categories).some((cat) => {
        if (!categories[cat]) return false;
        return !cat.startsWith("violence");
      });

      if (isHardBlock) {
        const flaggedCats = Object.keys(categories).filter((k) => categories[k] === true);
        return {
          allow: false,
          categories: flaggedCats,
          scores: scores,
        };
      }

      // ⚔️ 3. ACTION, ANIME, WAR MOVIES & SWORD FIGHTS ALLOWED
      // (Only extreme real-world graphic gore > 0.88 is blocked)
      const violenceGraphicScore = scores["violence/graphic"] || 0;
      const violenceScore = scores["violence"] || 0;

      if (violenceGraphicScore > 0.88 || violenceScore > 0.92) {
        return {
          allow: false,
          categories: ["violence/graphic"],
          scores: scores,
        };
      }

      // ✅ ALLOW: Anime & Fantasy battles, Scenery, Car awareness, Normal creative prompts
      return {
        allow: true,
        categories: [],
        scores: scores,
      };
    }

    return { allow: true, categories: [], scores: {} };
  } catch (error) {
    console.error("Failed to run safety check:", error.message);
    // FAIL CLOSED: If the safety check breaks or times out, we block the request.
    return {
      allow: false,
      categories: ["check_error"],
      scores: {},
    };
  }
}

module.exports = {
  checkSafety,
};

