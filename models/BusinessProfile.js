const mongoose = require("mongoose");

const BusinessProfileSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // One profile per user
        },

        // --- Core Business Identity ---
        business_name: { type: String, trim: true, default: "" },

        // Flexible String: Accepts "Startup", "Agency", or any future type
        business_type: { type: String, trim: true, default: "" },

        // Flexible String: Accepts dropdown value OR custom "Other" input
        industry: { type: String, trim: true, default: "" },

        business_description: { type: String, trim: true, default: "" },
        products_services: { type: String, trim: true, default: "" },

        // Flexible String: Accepts "Consumers", "B2B", etc.
        target_market: { type: String, trim: true, default: "" },

        customer_persona: { type: String, trim: true, default: "" },

        // Stores array of checked items (e.g., ["Online", "Specific Location"])
        geo_location: [{ type: String }],

        // Helper field if they type a specific city/country
        geo_specific_location: { type: String, default: "" },

        // --- Business Goals & Stage ---
        business_stage: { type: String, trim: true, default: "" },

        business_goals: [{ type: String }], // Multi-select array
        top_priority: { type: String, default: "" },
        monthly_revenue_range: { type: String, default: "" },

        // --- Customers & Sales ---
        customer_pain_points: { type: String, default: "" },
        customer_objections: { type: String, default: "" },
        primary_buyer: { type: String, default: "" },
        sales_cycle: { type: String, default: "" },
        pricing_model: { type: String, default: "" },
        price_range: { type: String, default: "" },

        // Multi-select arrays
        sales_channels: [{ type: String }],

        // --- Marketing & Growth ---
        marketing_channels: [{ type: String }],
        content_types: [{ type: String }],

        usp: { type: String, default: "" }, // Unique Selling Proposition
        competitors: { type: String, default: "" },
        top_keywords: { type: String, default: "" },

        // --- Operations & Tools ---
        tools_used: { type: String, default: "" },
        team_size: { type: String, default: "" },
        team_roles: [{ type: String }], // Multi-select
        biggest_bottleneck: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("BusinessProfile", BusinessProfileSchema);