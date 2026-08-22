
const express = require("express");
const Location = require("../models/Location");
const { protect } = require("../middleware/auth");

const router = express.Router();

/**
 * @desc Search locations
 * @route GET /api/locations/search?q=india&page=1&limit=50
 */
router.get("/search", protect, async (req, res) => {
  try {
    const q = req.query.q?.trim();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0; // 0 = no limit
    const skip = (page - 1) * limit;

    let query = {};

    if (q) {
      const regex = new RegExp(q, "i"); // case-insensitive search
      query = {
        $or: [
          { country: regex },
          { state: regex },
          { city: regex },
        ],
      };
    } else {
      // If no query, return all countries with empty state and city
      query = { state: "", city: "" };
    }

    let resultsQuery = Location.find(query);

    if (limit > 0) {
      resultsQuery = resultsQuery.skip(skip).limit(limit);
    }

    const results = await resultsQuery;

    // Format label and sort: country-only on top
    const formatted = results
      .map((loc) => {
        let label = loc.country;
        if (loc.state) label = `${loc.state}, ${label}`;
        if (loc.city) label = `${loc.city}, ${label}`;

        return {
          id: loc._id,
          label,
          short_code: loc.short_code || null,
          hasCityOrState: loc.city || loc.state ? 1 : 0, // for sorting
        };
      })
      .sort((a, b) => a.hasCityOrState - b.hasCityOrState) // country-only first
      .map(({ hasCityOrState, ...rest }) => rest); // remove helper field

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
      count: 0,
      data: [],
    });
  }
});


/**
 * @desc Bulk create locations
 * @route POST /api/locations/bulk
 * @body [{ country: "India", state: "Karnataka", city: "Bengaluru" }, ...]
 */
router.post("/bulk",protect, async (req, res) => {
  try {
    const locations = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    const inserted = await Location.insertMany(locations);
    res.status(201).json({ count: inserted.length, data: inserted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
