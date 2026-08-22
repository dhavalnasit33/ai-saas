// models/Location.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    state: { type: String },
    city: { type: String },
    short_code: { type: String }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Location", locationSchema);
