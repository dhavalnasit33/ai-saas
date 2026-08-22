const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

// Use the same reusable base schema
const Funding = mongoose.model("Funding", baseSchema);

module.exports = Funding;
