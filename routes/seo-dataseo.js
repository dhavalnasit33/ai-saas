const express = require("express");
const axios = require("axios");
const { protect } = require("../middleware/auth");
require("dotenv").config();

const router = express.Router();

// ===============================
// DataForSEO Config
// ===============================
const DFS_BASE_URL = "https://api.dataforseo.com/v3";
const DFS_LOGIN = process.env.DATAFORSEO_LOGIN;
const DFS_PASSWORD = process.env.DATAFORSEO_PASSWORD;

// Reusable auth config
const dfsConfig = {
  auth: {
    username: DFS_LOGIN,
    password: DFS_PASSWORD,
  },
  headers: {
    "Content-Type": "application/json",
  },
};

// ===============================
// 1️⃣ Keyword Ideas (Keyword → Keyword)
// ===============================
router.get("/keyword-ideas", protect, async (req, res) => {
  const {
    q,
    location = "United States",
    language = "English",
  } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "q" (seed keyword) is required',
    });
  }

  const payload = [
    {
      keywords: [q.trim()],
      location_name: location,
      language_name: language,
      limit: 10, // cost-safe
    },
  ];

  try {
    const response = await axios.post(
      `${DFS_BASE_URL}/keywords_data/google_ads/keywords_for_keywords/live`,
      payload,
      dfsConfig
    );

    const task = response.data?.tasks?.[0];

    res.json({
      success: true,
      count: task?.result?.length || 0,
      data: task?.result || [],
    });
  } catch (error) {
    console.error("❌ Keyword Ideas error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch keyword ideas",
      details: error.response?.data || error.message,
    });
  }
});

// ===============================
// 2️⃣ Keyword for Site (Site → Keywords)
// ===============================
router.get("/keyword-for-site", protect, async (req, res) => {
  const {
    target,
    location = "United States",
    language = "English",
  } = req.query;

  if (!target) {
    return res.status(400).json({
      success: false,
      error: 'Query parameter "target" (domain) is required',
    });
  }

  const payload = [
    {
      target: target.replace(/^https?:\/\//, ""),
      location_name: location,
      language_name: language,
      limit: 10, // cost-safe
    },
  ];

  try {
    const response = await axios.post(
      `${DFS_BASE_URL}/keywords_data/google_ads/keywords_for_site/live`,
      payload,
      dfsConfig
    );

    const task = response.data?.tasks?.[0];

    res.json({
      success: true,
      count: task?.result?.length || 0,
      data: task?.result || [],
    });
  } catch (error) {
    console.error("❌ Keyword for Site error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch keywords for site",
      details: error.response?.data || error.message,
    });
  }
});

// ===============================
// 3️⃣ Locations & Languages (FREE API)
// ===============================
router.get("/locations-languages", protect, async (req, res) => {
  try {
    const response = await axios.get(
      `${DFS_BASE_URL}/dataforseo_labs/locations_and_languages`,
      dfsConfig
    );

    const result = response.data?.tasks?.[0]?.result || [];

    res.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("❌ Locations & Languages error:", error.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch locations and languages",
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;
