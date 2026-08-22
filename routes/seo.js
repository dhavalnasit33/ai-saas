const express = require("express");
const { GoogleAdsApi, enums } = require("google-ads-api");
const { protect } = require("../middleware/auth");
require("dotenv").config();

const router = express.Router();

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_CLIENT_ID_ADS,
  client_secret: process.env.GOOGLE_CLIENT_SECRET_ADS,
  developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
});

// Your Google Ads Account ID (The one running the ads, NOT the Manager/MCC ID)
const CUSTOMER_ID = process.env.GOOGLE_CUSTOMER_ID;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

router.post("/keyword-ideas", protect, async (req, res) => {
  try {
    // 1. Get data from the frontend request
    // seeds: Array of strings (e.g., ["shoes", "boots"])
    // url: String (optional URL to scan)
    const { seeds, url, locationId, languageId } = req.body;

    if ((!seeds || seeds.length === 0) && !url) {
      return res
        .status(400)
        .json({ error: "Please provide 'seeds' keywords or a 'url'." });
    }

    // 2. Initialize Customer
    const customer = client.Customer({
      customer_id: CUSTOMER_ID,
      refresh_token: REFRESH_TOKEN,
      login_customer_id: "7321820074",
    });

    // 3. Prepare the request object
    const requestPayload = {
      customer_id: CUSTOMER_ID,
      language: `languageConstants/${languageId || "1000"}`, // Default to English
      geo_target_constants: [`geoTargetConstants/${locationId || "2840"}`], // Default to US
      keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
    };

    // Decide whether to search by Keyword Seed or Url Seed
    if (url) {
      requestPayload.url_seed = { url: url };
    } else {
      requestPayload.keyword_seed = { keywords: seeds };
    }

    // 4. Call Google Ads API
    const result = await customer.keywordPlanIdeas.generateKeywordIdeas(
      requestPayload
    );

    // 5. Clean the data (Format it nicely for your frontend)
    const formattedData = result.map((row) => {
      const metrics = row.keyword_idea_metrics || {};

      return {
        text: row.text,
        avgMonthlySearches: metrics.avg_monthly_searches ?? 0,
        competition: metrics.competition ?? "UNSPECIFIED",
        competitionIndex: metrics.competition_index ?? 0,
        lowBid: metrics.low_top_of_page_bid_micros
          ? metrics.low_top_of_page_bid_micros / 1_000_000
          : 0,
        highBid: metrics.high_top_of_page_bid_micros
          ? metrics.high_top_of_page_bid_micros / 1_000_000
          : 0,
      };
    });

    // 6. Send response
    res.json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Internal Server Error",
    });
  }
});

// function isValidHttpUrl(url) {
//   try {
//     const parsed = new URL(url);
//     return parsed.protocol === "http:" || parsed.protocol === "https:";
//   } catch {
//     return false;
//   }
// }

function normalizeUserUrl(input) {
  if (!input) return null;

  let url = input.trim();

  // If protocol missing → add https://
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isBlockedHost(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();

  return (
    ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(hostname) ||
    hostname.endsWith(".local") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

router.post("/keyword-for-site", protect, async (req, res) => {
  try {
    const { target, locationId, languageId } = req.body;

    // 🔹 Step 1: Normalize URL
    const parsedUrl = normalizeUserUrl(target);

    if (!parsedUrl) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid website URL.",
      });
    }

    // 🔹 Step 2: Block unsafe hosts
    if (isBlockedHost(parsedUrl)) {
      return res.status(403).json({
        success: false,
        error: "This URL is not allowed.",
      });
    }

    // 🔹 Step 3: Use normalized URL
    const normalizedTarget = parsedUrl.href;

    const customer = client.Customer({
      customer_id: CUSTOMER_ID,
      refresh_token: REFRESH_TOKEN,
      login_customer_id: "7321820074",
    });

    const requestPayload = {
      customer_id: CUSTOMER_ID,
      language: `languageConstants/${languageId || "1000"}`,
      geo_target_constants: [`geoTargetConstants/${locationId || "2840"}`],
      keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
      url_seed: { url: normalizedTarget },
    };

    const result = await customer.keywordPlanIdeas.generateKeywordIdeas(
      requestPayload
    );

    const formattedData = result.map((row) => {
      const metrics = row.keyword_idea_metrics || {};
      return {
        text: row.text,
        avgMonthlySearches: metrics.avg_monthly_searches ?? 0,
        competition: metrics.competition ?? "UNSPECIFIED",
        competitionIndex: metrics.competition_index ?? 0,
        lowBid: metrics.low_top_of_page_bid_micros
          ? metrics.low_top_of_page_bid_micros / 1_000_000
          : 0,
        highBid: metrics.high_top_of_page_bid_micros
          ? metrics.high_top_of_page_bid_micros / 1_000_000
          : 0,
      };
    });

    res.json({
      success: true,
      count: formattedData.length,
      data: formattedData,
    });
  } catch (error) {
    console.error("API Error (Keyword for Site):", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch keyword ideas.",
    });
  }
});

// router.post("/keyword-for-site", protect, async (req, res) => {
//   try {
//     const { target, locationId, languageId } = req.body;

//     if (!target) {
//       return res.status(400).json({
//         success: false,
//         error: "Please enter a website.",
//       });
//     }

//     const parsedUrl = normalizeUserUrl(target);

//     if (!parsedUrl) {
//       return res.status(400).json({
//         success: false,
//         error: "Invalid website.",
//       });
//     }

//     if (isBlockedHost(parsedUrl)) {
//       return res.status(403).json({
//         success: false,
//         error: "This website is not allowed.",
//       });
//     }

//     const customer = client.Customer({
//       customer_id: CUSTOMER_ID,
//       refresh_token: REFRESH_TOKEN,
//       login_customer_id: "7321820074",
//     });
//     console.log("parsedUrl.href", parsedUrl.href);
//     const requestPayload = {
//       customer_id: CUSTOMER_ID,
//       language: `languageConstants/${languageId || "1000"}`,
//       geo_target_constants: [`geoTargetConstants/${locationId || "2840"}`],
//       keyword_plan_network: enums.KeywordPlanNetwork.GOOGLE_SEARCH,
//       url_seed: {
//         url: parsedUrl.href, // ✅ ALWAYS valid URL
//       },
//     };

//     const result = await customer.keywordPlanIdeas.generateKeywordIdeas(
//       requestPayload
//     );

//     res.json({
//       success: true,
//       count: result.length,
//       data: result,
//     });
//   } catch (error) {
//     console.error("Keyword API error:", error);
//     res.status(500).json({
//       success: false,
//       error: "Failed to fetch keyword ideas.",
//     });
//   }
// });

module.exports = router;
