const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    job_id: { type: String, unique: true, required: true },

    // Basic info
    job_title: { type: String, required: true },
    employer_name: { type: String, default: "" },
    employer_logo: { type: String, default: "" },
    employer_website: { type: String, default: "" },
    job_publisher: { type: String, default: "" },

    // Employment info
    job_employment_type: { type: String, default: "" },

    // Apply info
    job_apply_link: { type: String, default: "" },
    job_apply_is_direct: { type: Boolean, default: false },
    apply_options: { type: Array, default: [] },

    // Dates
    job_posted_at: { type: String, default: "" },
    job_posted_at_timestamp: { type: Number, default: 0 },

    // Location
    job_location: { type: String, default: "" },
    job_city: { type: String, default: "" },
    job_state: { type: String, default: "" },
    job_latitude: { type: Number, default: 0 },
    job_longitude: { type: Number, default: 0 },

    // Benefits & Links
    job_benefits: { type: Array, default: [] },
    job_google_link: { type: String, default: "" },

    // Salary
    job_salary: { type: String, default: "" },

    // O*NET data
    job_onet_soc: { type: String, default: "" },

    // Computed/filter fields
    employment_type: [String],
   seniority: {
  type: [String],
  enum: ["ENTRY-LEVEL", "MID-LEVEL", "SENIOR", "MANAGER"],
  default: ["ENTRY-LEVEL"],
},
workplace: {
  type: [String],
  enum: ["REMOTE", "ONSITE", "HYBRID"],
  default: ["ONSITE"],
},
    salary: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      period: { type: String, default: "YEAR" },
    },
    country: { type: String, default: "" },
    job_post_date: { type: Date, default: "" },
    description: { type: String, default: "" },

    // Computed highlights
    job_highlights_computed: {
      qualifications: { type: [String], default: [] },
      responsibilities: { type: [String], default: [] },
      benefits: { type: [String], default: [] },
    },
    is_favorite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Jobs", JobSchema);
