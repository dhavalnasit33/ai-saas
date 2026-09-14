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

const SACRED_FIGURES_ERROR_MESSAGE =
  "Our system has detected that your request is in violation of our content moderation policy around sacred religious figures. Please change your request and try again.";

// Extensible Protected Sacred Figures Registry
const PROTECTED_FIGURES_REGISTRY = [
  // 1. Divine / Deity Figures (All traditions)
  {
    category: "divine",
    religion: "universal",
    names: [
      "god",
      "allah",
      "yahweh",
      "jehovah",
      "brahman",
      "bhagwan",
      "ishwar",
      "deity",
      "almighty",
      "creator",
    ],
  },
  // 2. Prophets (Abrahamic & others)
  {
    category: "prophet",
    religion: "islam_judaism_christianity",
    names: [
      "prophet muhammad",
      "prophet mohammad",
      "prophet mohammed",
      "rasool",
      "rasulullah",
      "nabi",
      "final prophet",
      "holy prophet",
      "last prophet",
      "jesus",
      "jesus christ",
      "prophet isa",
      "isa al-masih",
      "moses",
      "prophet musa",
      "musa",
      "abraham",
      "prophet ibrahim",
      "ibrahim",
      "adam",
      "prophet adam",
      "noah",
      "prophet nuh",
      "nuh",
      "joseph",
      "prophet yusuf",
      "yusuf",
      "david",
      "prophet dawood",
      "dawood",
      "solomon",
      "prophet sulaiman",
      "sulaiman",
      "jonah",
      "prophet yunus",
      "yunus",
      "elijah",
      "prophet ilyas",
      "ilyas",
      "john the baptist",
      "prophet yahya",
      "yahya",
      "ishmael",
      "prophet ismail",
      "ismail",
      "isaac",
      "prophet ishaq",
      "ishaq",
      "jacob",
      "prophet yaqub",
      "yaqub",
      "aaron",
      "prophet harun",
      "harun",
    ],
  },
  // 3. Prophet Muhammad's Family / Ahl al-Bayt & Rightly Guided Caliphs
  {
    category: "sacred_figure",
    religion: "islam",
    names: [
      "khadija",
      "khadijah",
      "aisha",
      "ayesha",
      "fatima",
      "fatimah",
      "ali ibn abi talib",
      "hazrat ali",
      "imam ali",
      "imam hassan",
      "imam hussain",
      "abu bakr",
      "umar ibn al-khattab",
      "hazrat umar",
      "uthman ibn affan",
      "hazrat uthman",
      "ahl al-bayt",
      "wives of prophet",
      "wife of the prophet",
      "daughter of the prophet",
    ],
  },
  // 4. Christian Sacred Figures
  {
    category: "christian_sacred",
    religion: "christianity",
    names: [
      "jesus",
      "jesus christ",
      "christ",
      "virgin mary",
      "mother mary",
      "holy spirit",
      "son of god",
    ],
  },
  // 5. Hindu Sacred Figures (Deities & Avatars)
  {
    category: "hindu_sacred",
    religion: "hinduism",
    names: [
      "shiva",
      "lord shiva",
      "vishnu",
      "lord vishnu",
      "brahma",
      "lord brahma",
      "krishna",
      "lord krishna",
      "rama",
      "lord rama",
      "ram",
      "lord ram",
      "ganesha",
      "lord ganesh",
      "ganesh",
      "hanuman",
      "lord hanuman",
      "bajrangbali",
      "lakshmi",
      "goddess lakshmi",
      "saraswati",
      "goddess saraswati",
      "parvati",
      "goddess parvati",
      "durga",
      "goddess durga",
      "kali",
      "goddess kali",
      "radha",
      "sita",
      "mata sita",
    ],
  },
  // 6. Sikh Sacred Figures
  {
    category: "sikh_sacred",
    religion: "sikhism",
    names: [
      "guru nanak",
      "guru nanak dev",
      "guru gobind singh",
      "guru granth sahib",
      "sikh guru",
    ],
  },
  // 7. Buddhist & Other Sacred Figures
  {
    category: "buddhist_other",
    religion: "buddhism_other",
    names: [
      "gautama buddha",
      "lord buddha",
      "the buddha",
      "siddhartha gautama",
      "mahavira",
      "lord mahavira",
      "bahaullah",
      "the bab",
    ],
  },
];

// Patterns that indicate active visual portrayal / depiction / impersonation
const DEPICTION_PATTERNS = [
  /\b(depict|depicting|portray|portraying|impersonate|impersonating|recreate|recreating|draw|drawing|generate|generating|paint|painting|illustrate|illustrating|show|showing|render|rendering|visualize|visualizing|create|creating)\b/i,
  /\b(me as|myself as|transform me into|turn me into|make me|dress me as|look like|face of)\b/i,
  /\b(with|beside|next to|standing with|talking to|meeting|interacting with|speaking with|face to face with)\b/i,
  /\b(portrait of|photo of|video of|image of|picture of|close[- ]up of|view of|face of|appearance of|figure of)\b/i,
];

/**
 * Checks if a combined text request violates the Protected Sacred Figures policy.
 * @param {string|Array<string>} inputs Text fields to evaluate (prompt, experience, role, sceneDescription, etc.)
 * @returns {{blocked: boolean, message: string, reason?: string, matchedFigure?: string}}
 */
function checkSacredFiguresPolicy(inputs) {
  if (!inputs) return { blocked: false, message: "" };

  let combinedText = "";
  if (Array.isArray(inputs)) {
    combinedText = inputs.filter(Boolean).join(" ");
  } else if (typeof inputs === "object") {
    combinedText = Object.values(inputs)
      .filter((v) => typeof v === "string")
      .join(" ");
  } else {
    combinedText = String(inputs);
  }

  if (!combinedText.trim()) return { blocked: false, message: "" };

  // Normalize text: lowercase, remove excess spaces & special punctuation
  const normalized = combinedText
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Fast Deterministic Registry Matching
  for (const entry of PROTECTED_FIGURES_REGISTRY) {
    for (const name of entry.names) {
      const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      const nameRegex = new RegExp(`\\b${escaped}\\b`, "i");

      if (nameRegex.test(normalized)) {
        const hasDepictionIntent = DEPICTION_PATTERNS.some((p) =>
          p.test(normalized)
        );

        const directMentionIsObjective =
          normalized.length < 60 ||
          hasDepictionIntent ||
          /\b(as|like|into)\b/i.test(normalized);

        if (hasDepictionIntent || directMentionIsObjective) {
          console.warn(
            `[SafetyGate - SacredFigures] Blocked request for protected figure: "${name}" in category: ${entry.category}`
          );
          return {
            blocked: true,
            message: SACRED_FIGURES_ERROR_MESSAGE,
            reason: "protected_sacred_figure_depiction",
            matchedFigure: name,
            category: entry.category,
          };
        }
      }
    }
  }

  return { blocked: false, message: "" };
}

module.exports = {
  checkSafety,
  checkSacredFiguresPolicy,
  SACRED_FIGURES_ERROR_MESSAGE,
};

