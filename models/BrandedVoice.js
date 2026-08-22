const mongoose = require("mongoose");

const brandedVoiceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // One voice per user
    },

    // 1. Brand Voice Description
    brand_voice_summary: {
      type: String,
      required: true, 
      trim: true,
      maxlength: 5000,
    },

    // 2. Tone Mix (Sliders 0-100)
    tone_playful_serious: { type: Number, min: 0, max: 100, default: 50 },
    tone_casual_formal: { type: Number, min: 0, max: 100, default: 50 },
    tone_bold_cautious: { type: Number, min: 0, max: 100, default: 50 },
    tone_friendly_authoritative: { type: Number, min: 0, max: 100, default: 50 },
    tone_emotional_analytical: { type: Number, min: 0, max: 100, default: 50 },

    // 3. Brand Personality Traits (Multi-select)
    personality_traits: [{ type: String }],

    // 4. Vocabulary Level (Dropdown)
    vocabulary_level: { type: String, default: "Conversational" },

    // 5. Emoji Usage (Dropdown)
    emoji_usage: { type: String, default: "Occasionally" },

    // 6. Humor Usage (Multi-select)
    humor_style: [{ type: String }],

    // 7. Writing Do's
    writing_dos: { type: String, default: "" },

    // 8. Writing Don'ts
    writing_donts: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BrandedVoice", brandedVoiceSchema);
// const mongoose = require("mongoose");

// const brandedVoiceSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User", // reference to the User model
//       required: true,
//     },
//     branded_name: {
//       type: String,
//       required: true,
//     },
//     branded_text: {
//       type: String,
//       required: true,
//       maxlength: 5000,
//     },
//     company_logo: {
//       type: String, // store as URL or file path
//       required: false,
//     },
//     company_design: {
//       type: String, // could be a description, theme, or file path
//       required: false,
//     },
//     supportive_documents: {
//       type: [String], // array of URLs/paths
//       default: [], // ensures empty array instead of undefined
//       required: false,
//     },
//   },
//   { timestamps: true }
// );

// // Optional: prevent duplicate brand names for the same user
// // brandedVoiceSchema.index({ user: 1, branded_name: 1 }, { unique: true });

// module.exports = mongoose.model("BrandedVoice", brandedVoiceSchema);


