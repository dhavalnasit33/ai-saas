const mongoose = require("mongoose");

// 1. Feature Schema (Existing - Kept as is)
const featureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
    show_value: { type: Boolean, default: true },
  },
  { _id: false }
);

// 2. Card Schema (UPDATED based on your Image)
const cardSchema = new mongoose.Schema(
  {
    // Filter Logic
    category: { type: String, required: true }, // e.g., "Page Builder", "Email Builder"

    // Visual Content
    title: { type: String, required: true }, // e.g., "Welcome & Onboarding"
    description: { type: String, required: true }, // e.g., "Make a lasting first impression..."
    image: { type: String, required: true }, // The main banner image
    icon_image: { type: String, default: "" }, // The small icon next to title (Robot/Email icon)

    // Badge (The floating pill: "Increase activation by 80%")
    badge_text: { type: String, default: "" },

    // Checklist items (e.g. ["User Welcome", "Product Tours"])
    checklist: [{ type: String }],

    // Action
    custom_url: { type: String, default: "" },
    button_text: { type: String, default: "Launch" },
  },
  { _id: false }
);

// 3. Tab Schema (NEW - To define the buttons at the top)
const tabSchema = new mongoose.Schema(
  {
    label: { type: String, required: true }, // e.g., "Page Builder"
    value: { type: String, required: true }, // e.g., "page_builder" (used for filtering logic)
  },
  { _id: false }
);

// 4. Main PageBuilder Schema
const pageBuilderSchema = new mongoose.Schema(
  {
    // --- Tabs Configuration (NEW) ---
    // This defines which filter buttons show up at the top
    tabs: [tabSchema],

    // --- Custom Data Arrays ---
    features: [featureSchema],
    cards: [cardSchema],

    // --- Common Fields ---
    short_description: {
      type: String,
      maxlength: [200, "Short category cannot exceed 200 characters"],
    },
    description: {
      type: String,
      maxlength: [50000, "Description cannot exceed 50000 characters"],
    },

    // --- SEO Fields ---
    seo_keyphrase: { type: String, default: "" },
    seo_title: { type: String, default: "" },
    meta_description: { type: String, default: "" },

    // --- Images ---
    cover_image: { type: String, default: "" },
    tool_cover_image: { type: String, default: "" },
    tab_normal_icon_image: { type: String, default: "" },
    tab_active_icon_image: { type: String, default: "" },
    tab_image: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PageBuilder", pageBuilderSchema);
