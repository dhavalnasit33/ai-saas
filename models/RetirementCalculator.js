const mongoose = require("mongoose");
const baseSchema = require("./commonSchema");

const RetirementCalculator = mongoose.model("RetirementCalculator", baseSchema);

module.exports = RetirementCalculator;
