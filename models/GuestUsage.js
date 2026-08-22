const mongoose = require("mongoose");

const GuestUsageSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  api_count: { type: Number, default: 0 },
  generation_count: { type: Number, default: 0 },
  last_used: { type: Date, default: Date.now },
});

module.exports = mongoose.model("GuestUsage", GuestUsageSchema);
