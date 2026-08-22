const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

// Use the same reusable base schema
const Research = mongoose.model("Research", baseSchema);

module.exports = Research;
